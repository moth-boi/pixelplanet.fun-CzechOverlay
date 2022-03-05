import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Provider } from 'react-redux';
import { configureAppStore, store } from 'store/store';
import { useAppTheme } from 'theme/makeStyles';
import { GlobalStyles } from 'tss-react';

import { CssBaseline, ThemeProvider } from '@mui/material';

import App from './app';
import { ErrorBoundaryFallbackModal } from './errorBoundaryFallbackModal';

const AppProvidersWrapper: React.FC = () => {
    const [appStore, setAppStore] = React.useState(store);
    const theme = useAppTheme();
    return (
        <React.StrictMode>
            <Provider store={appStore}>
                <GlobalStyles
                    styles={{
                        body: {
                            margin: 0,
                            padding: 0,
                        },
                    }}
                />
                <ThemeProvider theme={theme}>
                    <CssBaseline />
                    <ErrorBoundary FallbackComponent={ErrorBoundaryFallbackModal} onReset={() => setAppStore(configureAppStore())}>
                        <App />
                    </ErrorBoundary>
                </ThemeProvider>
            </Provider>
        </React.StrictMode>
    );
};

export default AppProvidersWrapper;