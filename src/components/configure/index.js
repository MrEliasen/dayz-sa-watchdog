import React from 'react';
import {withRouter, NavLink} from 'react-router-dom';
import {connect} from 'react-redux';
import {Container, Header, Button, Input, Form, Select} from 'semantic-ui-react'
import storage from 'electron-json-storage';

const categoryOptions = [
    {
        text: 'Player connected',
        value: 'connect',
    },
    {
        text: 'Player disconnected',
        value: 'disconnect',
    },
    {
        text: 'Player damage',
        value: 'damage',
    },
    {
        text: 'Player killed',
        value: 'killed',
    },
    {
        text: 'Chat message',
        value: 'chat',
    }
];

const typeOptions = [
    {
        text: 'PVE',
        value: 'pve',
    },
    {
        text: 'PVP',
        value: 'pvp',
    },
    {
        text: 'Suicides',
        value: 'suicide',
    },
    {
        text: 'Bleedouts',
        value: 'bleedout',
    },
    {
        text: 'Unknown',
        value: 'unknown',
    }
];

class Configure extends React.Component {
    state = {
        logFilePath: "",
        discordToken: "",
        discordServerID: "",
        discordChannelID: "",
        logEventsCategories: [],
        logEventsTypes: [],
        loading: true,
    };

    constructor(props) {
        super(props);
        this.$file = React.createRef();
    }

    componentDidMount() {
        storage.get('settings', (error, settings) => {
            if (!settings) {
                this.setState({
                    loading: false
                });
                return;
            }

            this.setState({
                ...settings,
                loading: false
            });
        });
    }

    save = (redirect = false) => {
        try {
            this.setState({
                loading: true
            });

            const settings = {...this.state};
            delete settings.loading;

            storage.set('settings', settings, (error) => {
                if (error) {
                    console.log(error);
                }

                this.setState({
                    loading: false
                });

                if (redirect) {
                    this.props.history.push('/main');
                }
            });
        } catch (error) {
            this.setState({
                loading: false
            });
        }
    }

    render() {
        const {
            logFilePath,
            discordToken,
            discordServerID,
            discordChannelID,
        } = this.state;

        return (
            <Container className="c-configure">
                <Header as='h2'>Settings</Header>
                <Form loading={this.state.loading}>
                    <Form.Field>
                        <label>Select Log File</label>
                        <Input
                            type="text"
                            placeholder="Click here to select file"
                            value={logFilePath}
                            onClick={() => this.$file.current.click()}
                        />
                        <input
                            type="file"
                            ref={this.$file}
                            style={{display: 'none'}}
                            onChange={(e) => {
                                e.preventDefault();
                                const file = event.target.files[0];

                                if (!file || !file.path) {
                                    this.setState({logFilePath: ''});
                                    return;
                                }

                                this.setState({
                                    logFilePath: event.target.files[0].path,
                                });
                            }}
                        />
                    </Form.Field>
                    <Form.Field>
                        <label>Discord Token</label>
                        <Input defaultValue={discordToken} onChange={(e) => this.setState({discordToken: e.target.value})} type="password" placeholder="Bot authentication token" />
                    </Form.Field>
                    <Form.Group widths='equal'>
                        <Form.Field>
                            <label>Discord Server ID</label>
                            <Input defaultValue={discordServerID} onChange={(e) => this.setState({discordServerID: e.target.value})} placeholder="Bot authentication token" />
                        </Form.Field>
                        <Form.Field>
                            <label>Discord Channel ID</label>
                            <Input defaultValue={discordChannelID} onChange={(e) => this.setState({discordChannelID: e.target.value})} placeholder="Bot authentication token" />
                        </Form.Field>
                    </Form.Group>
                    <Form.Field>
                        <label>Tracked Event Categories (leave empty for all)</label>
                        <Select
                            style={{width: '95%'}}
                            multiple
                            options={categoryOptions}
                            value={this.state.logEventsCategories}
                            onChange={(e, {value}) => this.setState({logEventsCategories: value})}
                        />
                    </Form.Field>
                    <Form.Field>
                        <label>Tracked Event Types (leave empty for all)</label>
                        <Select
                            style={{width: '95%'}}
                            multiple
                            options={typeOptions}
                            defaultValue={this.state.logEventsTypes}
                            onChange={(e, {value}) => this.setState({logEventsTypes: value})}
                        />
                    </Form.Field>
                    <Button color='blue' onClick={this.save}>Save</Button>
                    {
                        logFilePath &&
                        discordToken &&
                        discordServerID &&
                        discordChannelID &&
                        <Button color='green' onClick={() => this.save(true)}>Continue</Button>
                    }
                </Form>
            </Container>
        );
    }
};

export default withRouter(connect()(Configure));
