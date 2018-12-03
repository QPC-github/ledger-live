// @flow

import React, { PureComponent } from "react";
import { Trans } from "react-i18next";
import { StyleSheet, Linking } from "react-native";
import LText from "./LText";
import Touchable from "./Touchable";
import IconExternalLink from "../icons/ExternalLink";
import colors from "../colors";
import { urls } from "../config/urls";

export default class NeedHelp extends PureComponent<{}> {
  render() {
    return (
      <Touchable
        event="NeedHelp"
        style={styles.footer}
        onPress={() => Linking.openURL(urls.faq)}
      >
        <LText style={styles.footerText} semiBold>
          <Trans i18nKey="common.needHelp" />
        </LText>
        <IconExternalLink size={16} color={colors.live} />
      </Touchable>
    );
  }
}

const styles = StyleSheet.create({
  footer: {
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  footerText: {
    color: colors.live,
    marginRight: 8,
  },
});
