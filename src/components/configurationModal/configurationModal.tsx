import React from 'react';
import './configurationModal.scss';
import OverlayConfig from '../overlayConfig/overlayConfig';
import { Configuration } from '../../configuration';
import ConfigDropDown from '../configDropDown/configDropDown';
import { Checkbox, FormControlLabel, Tooltip } from '@material-ui/core';
import { GuiParametersState } from '../../store/guiTypes';
import { AppState } from '../../store';
import { connect } from 'react-redux';
import { ThunkDispatch } from 'redux-thunk';
import { updateOverlayEnabled } from '../../actions/guiActions';

interface OwnState {
    isModalMinimized: boolean;
}

interface OwnProps {
}

interface StateProps {
    guiState: GuiParametersState;
}

interface DispatchProps {
    isEnabled: (isEnabled: boolean) => void;
}

type Props = StateProps & DispatchProps & OwnProps;

class ConfigurationModal extends React.Component<Props, OwnState> {

    constructor(props: Props) {
        super(props);
        this.state = {
            isModalMinimized: false,
        };
    }

    render(): React.ReactNode {
        const {
            guiState,
            isEnabled,
        } = this.props;

        return (
        <div id="PictureOverlay_ConfigurationModalRoot">
            <Tooltip title="Toggle on/off Overlay. Shortcut: O">
                <FormControlLabel
                    control={
                        <Checkbox color="primary"
                            checked={guiState.overlayEnabled}
                            onChange={(e): void => isEnabled(e.target.checked)}
                        />
                    }
                    label="Image Overlay"
                    labelPlacement="end"
                />
            </Tooltip>
            <div style={{
                display: guiState.overlayEnabled ? '' : 'none',
            }}>
                <div style={{
                    display: this.state.isModalMinimized ? 'none' : '',
                }}>
                    <div id="PictureOverlay_BaseForExpand">
                        <OverlayConfig/>
                    </div>
                    <ConfigDropDown/>
                </div>
                <img
                    src={
                        this.state.isModalMinimized ?
                        'https://fonts.gstatic.com/s/i/materialicons/expand_more/v1/24px.svg' :
                        'https://fonts.gstatic.com/s/i/materialicons/expand_less/v1/24px.svg'
                    }
                    onClick={(): void => this.setState({
                        ...this.state,
                        isModalMinimized: !this.state.isModalMinimized,
                    })}
                />
            </div>
        </div>
        );
    }
}

function mapStateToProps(state: AppState, ownProps: OwnProps): StateProps {
    return {
        guiState: state.guiData,
    };
}

function mapDispatchToProps(
    dispatch: ThunkDispatch<{}, {}, any>,
    ownProps: OwnProps,
): DispatchProps {
    return {
        isEnabled: (isEnabled: boolean) => dispatch(updateOverlayEnabled(isEnabled)),
    };
}

export default connect<StateProps, DispatchProps, OwnProps, AppState>(
    mapStateToProps,
    mapDispatchToProps,
)(ConfigurationModal);
