import React from 'react';
import {shell, remote} from 'electron';
import {withRouter, NavLink} from 'react-router-dom';
import {connect} from 'react-redux';
import {Container, Segment, Header, Button, Input, Form, Select, Divider, Checkbox} from 'semantic-ui-react';
import storage from 'electron-json-storage';

const databaseOptions = [
    /*{
        text: '',
        value: '',
    },
    {
        text: 'MySQL/MariaDB',
        value: 'mysql',
    },
    {
        text: 'PostgreSQL',
        value: 'pg ',
    },*/
    {
        text: 'SQLite3',
        value: 'sqlite3',
    },
];

function isEmpty(value) {
    if (!value || value === '') {
        return true;
    }

    return false;
}

class Configure extends React.Component {
    state = {
        logFileDirectory: '',
        discordToken: '',
        discordServerID: '',
        discordChannelID: '',
        discordStatus: 'Watching you..',
        collectStats: true,
        databaseType: '',
        databaseHost: '',
        databasePort: null,
        databaseName: '',
        databaseUser: '',
        databasePassword: '',
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
            logFileDirectory,
            discordToken,
            discordServerID,
            discordChannelID,
            discordStatus,
            collectStats,
            databaseType,
            databaseHost,
            databasePort,
            databaseName,
            databaseUser,
            databasePassword,
        } = this.state;

        const requireDBDetails = (databaseType !== '' && databaseType !== 'sqlite3');

        return (
            <Container className="c-configure">
                <Form loading={this.state.loading}>
                    <Divider horizontal>DayZ SA/Logs Settings</Divider>
                    <Segment>
                        <Form.Group widths='equal'>
                            <Form.Field>
                                <label>Select the DayZ SA .ADM log file directory</label>
                                <Input
                                    type="text"
                                    placeholder="Click here to select file"
                                    value={logFileDirectory}
                                    onClick={() => this.$file.current.click()}
                                />
                                <p>This is where the DayZServer_x64.ADM / DayZServer_x64_*.ADM files are located.</p>
                                <input
                                    type="file"
                                    webkitdirectory="yes"
                                    ref={this.$file}
                                    style={{display: 'none'}}
                                    onChange={(e) => {
                                        e.preventDefault();
                                        const file = event.target.files[0];

                                        if (!file || !file.path) {
                                            this.setState({logFileDirectory: ''});
                                            return;
                                        }

                                        this.setState({
                                            logFileDirectory: event.target.files[0].path,
                                        });
                                    }}
                                />
                            </Form.Field>
                        </Form.Group>
                    </Segment>

                    <Divider horizontal>Player/Server Stats</Divider>

                    <Segment>
                        <Form.Group widths='equal'>
                            <Form.Field>
                                <label>Database Type</label>
                                <Select
                                    options={databaseOptions}
                                    value={databaseType}
                                    onChange={(e, {value}) => this.setState({databaseType: value})}
                                />
                                <p><small>Please choose the type of database to store the log file stats in.</small></p>
                            </Form.Field>
                            <Form.Field>
                                <p>SQLite3 comes bundled with this app and will not require any additional details. Just remember to backup the database file, found in the <span className="app-link" onClick={() => shell.openItem(remote.app.getPath('userData'))}>app-data directory</span>. You can also delete the database file and restart the watchdog to re-import all data.</p>
                            </Form.Field>
                        </Form.Group>
                    </Segment>

                    <Divider horizontal>Discord Settings</Divider>
                    <Segment>
                        <Form.Group widths='equal'>
                            <Form.Field>
                                <label>Discord Bot Status</label>
                                <Input defaultValue={discordStatus} onChange={(e) => this.setState({discordStatus: e.target.value})} placeholder="Enter bot status text" />
                                <p><small>Which "game" the bot should appear to be playing.</small></p>
                            </Form.Field>
                            <Form.Field>
                                <label>*Discord Authentication Token</label>
                                <Input defaultValue={discordToken} onChange={(e) => this.setState({discordToken: e.target.value})} type="password" placeholder="Bot authentication token" />
                                <p><small>You can find it <a href="#" onClick={() => shell.openExternal('https://discordapp.com/developers/applications')}>here</a>, under the application -> bot settings.</small></p>
                            </Form.Field>
                        </Form.Group>
                        <Form.Group widths='equal'>
                            <Form.Field>
                                <label>*Discord Server ID</label>
                                <Input defaultValue={discordServerID} onChange={(e) => this.setState({discordServerID: e.target.value})} placeholder="Bot authentication token" />
                                <p><small>ID of the server to post in. Right-click a server in Discord and "Copy ID".</small></p>
                            </Form.Field>
                            <Form.Field>
                                <label>*Discord Channel ID</label>
                                <Input defaultValue={discordChannelID} onChange={(e) => this.setState({discordChannelID: e.target.value})} placeholder="Bot authentication token" />
                                <p><small>ID of the channel to listen for commands in. If empty, only DMs are used. Right-click a channel in a Discord server and "Copy ID".</small></p>
                            </Form.Field>
                        </Form.Group>
                    </Segment>

                    <div style={{textAlign: 'right'}}>
                        <Button
                            color='green'
                            onClick={this.save}
                            disabled={(isEmpty(logFileDirectory) || isEmpty(discordToken) || isEmpty(discordServerID) || isEmpty(discordChannelID))}
                        >Save & Continue</Button>
                    </div>
                </Form>
            </Container>
        );
    }
};

export default withRouter(connect()(Configure));
