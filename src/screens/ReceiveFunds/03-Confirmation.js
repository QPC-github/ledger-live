// @flow

import React, { Component } from "react";
import i18next from "i18next";
import {
  View,
  StyleSheet,
  Dimensions,
  Linking,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-navigation";
import { createStructuredSelector } from "reselect";
import { connect } from "react-redux";
import QRCode from "react-native-qrcode-svg";
import { translate, Trans } from "react-i18next";
import type { NavigationScreenProp } from "react-navigation";
import type { Account } from "@ledgerhq/live-common/lib/types";
import getAddress from "@ledgerhq/live-common/lib/hw/getAddress";

import { open } from "../../logic/hw";
import { accountScreenSelector } from "../../reducers/accounts";
import colors from "../../colors";
import { TrackScreen } from "../../analytics";
import PreventNativeBack from "../../components/PreventNativeBack";
import StepHeader from "../../components/StepHeader";
import LText from "../../components/LText/index";
import DisplayAddress from "../../components/DisplayAddress";
import VerifyAddressDisclaimer from "../../components/VerifyAddressDisclaimer";
import BottomModal from "../../components/BottomModal";
import DeviceNanoAction from "../../components/DeviceNanoAction";
import Close from "../../icons/Close";
import Touchable from "../../components/Touchable";
import TranslatedError from "../../components/TranslatedError";
import Button from "../../components/Button";
import CurrencyIcon from "../../components/CurrencyIcon";
import { urls } from "../../config/urls";

type Navigation = NavigationScreenProp<{
  params: {
    accountId: string,
    deviceId: string,
    allowNavigation?: boolean,
  },
}>;

type Props = {
  account: Account,
  navigation: Navigation,
};

type State = {
  verified: boolean,
  isModalOpened: boolean,
  onModalHide: Function,
  error: ?Error,
};

class ReceiveConfirmation extends Component<Props, State> {
  static navigationOptions = ({ navigation }) => {
    const options: any = {
      headerTitle: (
        <StepHeader
          title={i18next.t("account.receive")}
          subtitle={i18next.t("send.stepperHeader.stepRange", {
            currentStep: "3",
            totalSteps: "3",
          })}
        />
      ),
    };

    if (!navigation.getParam("allowNavigation")) {
      options.headerLeft = null;
      options.headerRight = null;
      options.gesturesEnabled = false;
    }

    return options;
  };

  state = {
    verified: false,
    isModalOpened: false,
    onModalHide: () => {},
    error: null,
  };

  componentDidMount() {
    const { navigation } = this.props;
    const deviceId = navigation.getParam("deviceId");

    if (deviceId) {
      this.verifyOnDevice(deviceId);
      navigation.dangerouslyGetParent().setParams({ allowNavigation: false });
    } else {
      navigation.setParams({ allowNavigation: true });
    }
  }

  verifyOnDevice = async (deviceId: string) => {
    const { account, navigation } = this.props;

    const transport = await open(deviceId);
    try {
      await getAddress(
        transport,
        account.currency,
        account.freshAddressPath,
        true,
      );
      this.setState({ verified: true });
    } catch (error) {
      this.setState({ error, isModalOpened: true });
    } finally {
      navigation.setParams({ allowNavigation: true });
      navigation.dangerouslyGetParent().setParams({ allowNavigation: true });
    }
    await transport.close();
  };

  onRetry = () => {
    if (this.state.isModalOpened) {
      this.setState({
        isModalOpened: false,
        onModalHide: this.props.navigation.goBack,
      });
    } else {
      this.props.navigation.goBack();
    }
  };

  onModalClose = () => {
    this.setState({
      isModalOpened: false,
      onModalHide: this.onDone,
    });
  };

  onDone = () => {
    if (this.props.navigation.dismiss) {
      this.props.navigation.dismiss();
    }
  };

  render(): React$Node {
    const { account, navigation } = this.props;
    const { verified, error, isModalOpened, onModalHide } = this.state;
    const { width } = Dimensions.get("window");
    const unsafe = !navigation.getParam("deviceId");
    const allowNavigation = navigation.getParam("allowNavigation");

    return (
      <SafeAreaView style={styles.root}>
        <TrackScreen
          category="ReceiveFunds"
          name="Confirmation"
          unsafe={unsafe}
          verified={verified}
        />
        {allowNavigation ? null : <PreventNativeBack />}
        <ScrollView style={{ flex: 1 }}>
          <View style={styles.container}>
            <View style={styles.qrWrapper}>
              <QRCode size={width / 2 - 30} value={account.freshAddress} />
            </View>
            <View>
              <LText style={styles.addressTitle}>
                <Trans i18nKey="transfer.receive.address" />
              </LText>
            </View>
            <View style={styles.addressWrapper}>
              <CurrencyIcon currency={account.currency} size={24} />
              <LText semiBold style={styles.addressTitleBold}>
                {account.name}
              </LText>
            </View>
            <View style={styles.address}>
              <DisplayAddress
                address={account.freshAddress}
                verified={verified}
              />
            </View>
          </View>
          <View style={styles.bottomContainer}>
            <VerifyAddressDisclaimer
              unsafe={unsafe}
              verified={verified}
              action={
                verified ? (
                  <Touchable
                    event="ReceiveVerifyTransactionHelp"
                    onPress={() =>
                      Linking.openURL(urls.verifyTransactionDetails).catch(
                        err => console.error("An error occurred", err),
                      )
                    }
                  >
                    <LText semiBold style={styles.learnmore}>
                      Learn More
                    </LText>
                  </Touchable>
                ) : null
              }
              text={
                unsafe ? (
                  <Trans
                    i18nKey="transfer.receive.verifySkipped"
                    values={{
                      accountType: account.currency.managerAppName,
                    }}
                  />
                ) : verified ? (
                  <Trans i18nKey="transfer.receive.verified" />
                ) : (
                  <Trans
                    i18nKey="transfer.receive.verifyPending"
                    values={{
                      currencyName: account.currency.managerAppName,
                    }}
                  />
                )
              }
            />
          </View>
        </ScrollView>
        {verified && (
          <View style={styles.footer}>
            <Button
              event="ReceiveDone"
              containerStyle={styles.button}
              onPress={this.onDone}
              type="secondary"
              title={<Trans i18nKey="common.close" />}
            />
            <Button
              event="ReceiveVerifyAgain"
              containerStyle={styles.bigButton}
              type="primary"
              title={<Trans i18nKey="transfer.receive.verifyAgain" />}
              onPress={this.onRetry}
            />
          </View>
        )}
        <BottomModal
          id="ReceiveConfirmationModal"
          isOpened={isModalOpened}
          onModalHide={onModalHide}
        >
          {error ? (
            <View style={styles.modal}>
              <View style={styles.modalBody}>
                <View style={styles.modalIcon}>
                  <DeviceNanoAction error={error} />
                </View>
                <LText secondary semiBold style={styles.modalTitle}>
                  <TranslatedError error={error} />
                </LText>
                <LText style={styles.modalDescription}>
                  <TranslatedError error={error} field="description" />
                </LText>
              </View>
              <View style={styles.buttonsContainer}>
                <Button
                  event="ReceiveContactUs"
                  type="secondary"
                  title={<Trans i18nKey="common.contactUs" />}
                  containerStyle={styles.button}
                  onPress={() => {}} // TODO do something
                />
                <Button
                  event="ReceiveRetry"
                  type="primary"
                  title={<Trans i18nKey="common.retry" />}
                  containerStyle={styles.bigButton}
                  onPress={this.onRetry}
                />
              </View>
            </View>
          ) : null}
          <Touchable
            event="ReceiveClose"
            style={styles.close}
            onPress={this.onModalClose}
          >
            <Close color={colors.fog} size={20} />
          </Touchable>
        </BottomModal>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.white,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
    alignItems: "center",
  },
  bottomContainer: {
    padding: 16,
    paddingTop: 32,
  },
  qrWrapper: {
    borderWidth: 1,
    borderColor: colors.lightFog,
    padding: 15,
    borderRadius: 4,
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: {
      height: 4,
    },
  },
  addressTitle: {
    paddingTop: 24,
    fontSize: 14,
    color: colors.grey,
  },
  addressTitleBold: {
    paddingLeft: 8,
    fontSize: 16,
    color: colors.darkBlue,
  },
  addressWrapper: {
    paddingTop: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  address: {
    paddingTop: 24,
  },
  modal: {
    flexDirection: "column",
    minHeight: 350,
  },
  modalBody: {
    alignItems: "center",
    paddingHorizontal: 16,
  },
  modalIcon: {
    paddingTop: 60,
  },
  modalTitle: {
    paddingTop: 40,
    fontSize: 16,
    color: colors.darkBlue,
    textAlign: "center",
  },
  modalDescription: {
    paddingTop: 16,
    fontSize: 14,
    color: colors.grey,
    paddingHorizontal: 40,
    textAlign: "center",
  },
  buttonsContainer: {
    flexDirection: "row",
    paddingHorizontal: 8,
    alignItems: "flex-end",
    flexGrow: 1,
  },
  button: {
    flexGrow: 1,
    marginHorizontal: 8,
  },
  bigButton: {
    flexGrow: 2,
    marginHorizontal: 8,
  },
  footer: {
    flexDirection: "row",
    marginBottom: 16,
    paddingHorizontal: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.lightFog,
  },
  close: {
    position: "absolute",
    right: 10,
    top: 10,
  },
  learnmore: {
    color: colors.live,
    paddingLeft: 8,
    paddingTop: 4,
  },
});

const mapStateToProps = createStructuredSelector({
  account: accountScreenSelector,
});

export default connect(mapStateToProps)(translate()(ReceiveConfirmation));
