import React from 'react';
import {shell} from 'electron';
import {withRouter, NavLink} from 'react-router-dom';
import {connect} from 'react-redux';
import {Container, Header, Button, Input, Form, Select, Divider} from 'semantic-ui-react';
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
    },
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
    },
];

class Configure extends React.Component {
    state = {
        logFilePath: '',
        discordToken: '',
        discordServerID: '',
        discordChannelID: '',
        logEventsCategories: [],
        logEventsTypes: [],
        discordStatus: 'Watching you..',
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
                    loading: false,
                });
                return;
            }

            this.setState({
                ...settings,
                loading: false,
            });
        });
    }

    save = (redirect = false) => {
        try {
            this.setState({
                loading: true,
            });

            const settings = {...this.state};
            delete settings.loading;

            storage.set('settings', settings, (error) => {
                if (error) {
                    console.log(error);
                }

                if (redirect) {
                    this.props.history.push('/main');
                }
            });
        } catch (error) {
            this.setState({
                loading: false,
            });
        }
    }

    render() {
        const {
            logFilePath,
            discordToken,
            discordServerID,
            discordChannelID,
            discordStatus,
        } = this.state;

        return (
            <Container className="c-configure">
                <Form loading={this.state.loading}>
                    <Form.Field>
                        <label>Select .ADM log file to track</label>
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
                    <Form.Group widths='equal'>
                        <Form.Field>
                            <label>Discord Authentication Token</label>
                            <Input defaultValue={discordToken} onChange={(e) => this.setState({discordToken: e.target.value})} type="password" placeholder="Bot authentication token" />
                            <p><small>You can find it <a href="#" onClick={() => shell.openExternal('https://discordapp.com/developers/applications')}>here</a>, under the application -> bot settings.</small></p>
                        </Form.Field>
                        <Form.Field>
                            <label>Discord Bot Status</label>
                            <Input defaultValue={discordStatus} onChange={(e) => this.setState({discordStatus: e.target.value})} placeholder="Enter bot status text" />
                            <p><small>Which "game" the bot should appear to be playing.</small></p>
                        </Form.Field>
                    </Form.Group>
                    <Form.Group widths='equal'>
                        <Form.Field>
                            <label>Discord Server ID</label>
                            <Input defaultValue={discordServerID} onChange={(e) => this.setState({discordServerID: e.target.value})} placeholder="Bot authentication token" />
                            <p><small>ID of the server to post in. Right-click a server in Discord and "Copy ID".</small></p>
                        </Form.Field>
                        <Form.Field>
                            <label>Discord Channel ID</label>
                            <Input defaultValue={discordChannelID} onChange={(e) => this.setState({discordChannelID: e.target.value})} placeholder="Bot authentication token" />
                            <p><small>ID of the channel, in the above server, to post to. Right-click a channel in a Discord server and "Copy ID".</small></p>
                        </Form.Field>
                    </Form.Group>
                    <Form.Group widths='equal'>
                        <Form.Field>
                            <label>Event Categories</label>
                            <Select
                                style={{width: '89%'}}
                                multiple
                                options={categoryOptions}
                                value={this.state.logEventsCategories}
                                onChange={(e, {value}) => this.setState({logEventsCategories: value})}
                            />
                            <p><small>Select any specific event categories to track, or leave empty for all.</small></p>
                        </Form.Field>
                        <Form.Field>
                            <label>Tracked Event Types</label>
                            <Select
                                style={{width: '89%'}}
                                multiple
                                options={typeOptions}
                                defaultValue={this.state.logEventsTypes}
                                onChange={(e, {value}) => this.setState({logEventsTypes: value})}
                            />
                            <p><small>Select any specific event types (sub category, eg: Player Killed + PvP) to track, or leave empty for all.</small></p>
                        </Form.Field>
                    </Form.Group>
                    <Divider/>
                    <Button floated='left' color='blue' onClick={this.save}>Save</Button>
                    {
                        logFilePath &&
                        discordToken &&
                        discordServerID &&
                        discordChannelID &&
                        <Button floated='right' color='green' onClick={() => this.save(true)}>Save & Continue</Button>
                    }
                </Form>
            </Container>
        );
    }
};

export default withRouter(connect()(Configure));
