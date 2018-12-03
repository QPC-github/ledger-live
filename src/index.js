// @flow
import "../shim";
import "./polyfill"; /* eslint-disable import/first */
import React, { Fragment, Component } from "react";
import { StyleSheet, View } from "react-native";
// import { useScreens } from "react-native-screens";
import SplashScreen from "react-native-splash-screen";
import { exportSelector as settingsExportSelector } from "./reducers/settings";
import { exportSelector as accountsExportSelector } from "./reducers/accounts";
import { exportSelector as bleSelector } from "./reducers/ble";
import CounterValues from "./countervalues";
import LocaleProvider from "./context/Locale";
import RebootProvider from "./context/Reboot";
import ButtonUseTouchable from "./context/ButtonUseTouchable";
import AuthPass from "./context/AuthPass";
import LedgerStoreProvider from "./context/LedgerStore";
import { RootNavigator } from "./navigators";
import LoadingApp from "./components/LoadingApp";
import StyledStatusBar from "./components/StyledStatusBar";
import { BridgeSyncProvider } from "./bridge/BridgeSyncContext";
import DBSave from "./components/DBSave";
import DebugRejectSwitch from "./components/DebugRejectSwitch";
import AppStateListener from "./components/AppStateListener";
import SyncNewAccounts from "./bridge/SyncNewAccounts";
import { OnboardingContextProvider } from "./screens/Onboarding/onboardingContext";
import HookAnalytics from "./analytics/HookAnalytics";
import HookSentry from "./components/HookSentry";

// useScreens(); // FIXME this is not working properly when using react-native-modal inside Send flow

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

class App extends Component<*> {
  hasCountervaluesChanged = (a, b) => a.countervalues !== b.countervalues;

  hasSettingsChanged = (a, b) => a.settings !== b.settings;

  hasAccountsChanged = (a, b) => a.accounts !== b.accounts;

  hasBleChanged = (a, b) => a.ble !== b.ble;

  render() {
    return (
      <View style={styles.root}>
        <StyledStatusBar />

        <DBSave
          dbKey="countervalues"
          throttle={2000}
          hasChanged={this.hasCountervaluesChanged}
          lense={CounterValues.exportSelector}
        />
        <DBSave
          dbKey="settings"
          throttle={400}
          hasChanged={this.hasSettingsChanged}
          lense={settingsExportSelector}
        />
        <DBSave
          dbKey="accounts"
          throttle={500}
          hasChanged={this.hasAccountsChanged}
          lense={accountsExportSelector}
        />
        <DBSave
          dbKey="ble"
          throttle={500}
          hasChanged={this.hasBleChanged}
          lense={bleSelector}
        />

        <AppStateListener />

        <SyncNewAccounts priority={5} />

        <RootNavigator />

        <DebugRejectSwitch />
      </View>
    );
  }
}

export default class Root extends Component<{}, { appState: * }> {
  initTimeout: *;

  componentWillUnmount() {
    clearTimeout(this.initTimeout);
  }

  componentDidCatch(e: *) {
    console.error(e);
    throw e;
  }

  onInitFinished = () => {
    this.initTimeout = setTimeout(() => SplashScreen.hide(), 300);
  };

  onRebootStart = () => {
    clearTimeout(this.initTimeout);
    if (SplashScreen.show) SplashScreen.show(); // on iOS it seems to not be exposed
  };

  render() {
    return (
      <RebootProvider onRebootStart={this.onRebootStart}>
        <LedgerStoreProvider onInitFinished={this.onInitFinished}>
          {(ready, store) =>
            ready ? (
              <Fragment>
                <HookSentry />
                <HookAnalytics store={store} />
                <AuthPass>
                  <LocaleProvider>
                    <BridgeSyncProvider>
                      <CounterValues.PollingProvider>
                        <ButtonUseTouchable.Provider value={true}>
                          <OnboardingContextProvider>
                            <App />
                          </OnboardingContextProvider>
                        </ButtonUseTouchable.Provider>
                      </CounterValues.PollingProvider>
                    </BridgeSyncProvider>
                  </LocaleProvider>
                </AuthPass>
              </Fragment>
            ) : (
              <LoadingApp />
            )
          }
        </LedgerStoreProvider>
      </RebootProvider>
    );
  }
}

if (__DEV__) {
  require("./snoopy");
}
