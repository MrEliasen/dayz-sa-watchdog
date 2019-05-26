import React from 'react';
import {shell, remote} from 'electron';
import {withRouter, NavLink} from 'react-router-dom';
import {connect} from 'react-redux';
import {Container, Segment, Header, Button, Input, Form, Select, Divider, Checkbox, Icon} from 'semantic-ui-react';
import storage from 'electron-json-storage';
import Discord from 'discord.js';
import Database from '../../watchdog/database';

import createDOMPurify from 'dompurify';
import {JSDOM} from 'jsdom';

const window = (new JSDOM('')).window;
const DOMPurify = createDOMPurify(window);

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
    if (!value) {
        return true;
    }

    if (Array.isArray(value) && value.length === 0) {
        return true;
    } else if (value === '') {
        return true;
    }

    return false;
}

class Configure extends React.Component {
    state = {
        logFileDirectories: [],
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
        permissions: '',
        resetRole: '',
        roles: [],
        players: [],
        ignore: [],
        discordLoading: false,
        discordError: '',
        playersLoading: false,
        playersError: '',
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

    getPlayers = async () => {
        try {
            const {state} = this;
            this.setState({playersLoading: true});

            const fakeServer = {
                config: state,
                logger: (...args) => {
                    console.log(args);
                },
            };

            const database = new Database(fakeServer);
            await database.load();

            const players = await database.connection
                .raw(`SELECT
                            player_name,
                            player_bisid
                        FROM
                            players
                        WHERE
                            player_name NOT LIKE "Survivor"
                        AND
                            player_name NOT LIKE "Survivor (%"
                        GROUP BY
                            player_bisid
                        ORDER BY
                            player_name ASC`);

            if (!players) {
                return;
            }

            const playerList = players.map((player) => {
                return {
                    text: DOMPurify.sanitize(player.player_name),
                    value: player.player_bisid,
                };
            });

            this.setState({
                playersLoading: false,
                players: playerList,
            });
        } catch (err) {
            this.setState({playersLoading: false, playersError: err.message});
        }
    }

    getRoles = () => {
        try {
            const {discordToken, discordServerID} = this.state;

            if (discordToken === '' || discordServerID === '') {
                return;
            }

            this.setState({discordLoading: true, discordError: ''});

            // Create the bot
            this.client = new Discord.Client();

            // Console log the client user when its logged in
            this.client.on('ready', async () => {
                const guild = this.client.guilds.get(discordServerID);
                const roles = guild.roles.map((role) => {
                    return {
                        text: role.name,
                        value: role.id,
                    };
                });

                this.setState({
                    discordLoading: false,
                    roles: [
                        {
                            text: '',
                            value: '',
                        },
                        ...roles,
                    ],
                });

                this.client.destroy();
            });

            this.client.on('error', (err) => {
                console.log(err);
                this.setState({discordLoading: false});
            });

            this.client.on('disconnect', (err) => {
                console.log(err);
                this.setState({
                    discordLoading: false,
                    discordError: err.code !== 1000 ? err.reason : '',
                });
            });

            this.client.login(discordToken);
        } catch (err) {
            this.setState({discordLoading: false});
            console.log(err);
        }
    }

    save = (redirect = false) => {
        try {
            this.setState({
                loading: true,
            });

            const settings = {...this.state};
            delete settings.loading;
            delete settings.discordLoading;

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
            logFileDirectories,
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
            permissions,
            resetRole,
            roles,
            players,
            ignore,
            discordLoading,
            discordError,
            playersLoading,
            playersError,
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
                                <p>This is where the DayZServer_x64.ADM / DayZServer_x64_*.ADM files are located.</p>
                                <Button
                                    color="blue"
                                    onClick={() => this.$file.current.click()}
                                >
                                    Add Directory
                                </Button>
                                <input
                                    type="file"
                                    webkitdirectory="yes"
                                    ref={this.$file}
                                    style={{display: 'none'}}
                                    onChange={(e) => {
                                        e.preventDefault();
                                        const file = event.target.files[0];

                                        if (!file || !file.path) {
                                            return;
                                        }

                                        const newLogFileDirectories = [...logFileDirectories];
                                        newLogFileDirectories.push(event.target.files[0].path);
                                        this.setState({logFileDirectories: newLogFileDirectories});
                                    }}
                                />
                            </Form.Field>
                            <Form.Field>
                                <label>List of directories to watch</label>
                                {
                                    logFileDirectories.length < 1 &&
                                    <p>No directories selected.</p>
                                }
                                {
                                    logFileDirectories.length > 0 &&
                                    logFileDirectories.map((dir) => {
                                        return (
                                            <Input
                                                key={dir}
                                                value={dir}
                                                readOnly
                                                action={{
                                                    color: 'red',
                                                    icon: 'trash',
                                                    onClick: () => {
                                                        const newLogFileDirectories = [...logFileDirectories];

                                                        this.setState({
                                                            logFileDirectories: newLogFileDirectories.filter((oDir) => oDir !== dir),
                                                        });
                                                    },
                                                }}
                                            />
                                        );
                                    })
                                }
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

                    <Divider horizontal>Access Roles</Divider>

                    <Segment>
                        <Form.Group widths='equal'>
                            <Form.Field>
                                <label>Role with access to !logs</label>
                                <Select
                                    options={roles}
                                    value={permissions}
                                    onChange={(e, {value}) => this.setState({permissions: value})}
                                />
                                <p><small>Select the admin/mod role who should have access to use the !logs command.</small></p>
                            </Form.Field>
                            <Form.Field>
                                <label>Role with access to !reset</label>
                                <Select
                                    options={roles}
                                    value={resetRole}
                                    onChange={(e, {value}) => this.setState({resetRole: value})}
                                />
                                <p><small>Select the admin/mod role who should have access to use the !reset command.</small></p>
                            </Form.Field>
                        </Form.Group>
                        <Form.Group widths='equal'>
                            <Form.Field>
                                <Form.Field>
                                    <label>Fetch the latest list of user roles</label>
                                    {
                                        (discordToken === '' ||
                                        discordServerID === '') &&
                                        <p>Please enter discord details.</p>
                                    }
                                    {
                                        discordToken !== '' &&
                                        discordServerID !== '' &&
                                        <Button color="blue" disabled={discordLoading} onClick={this.getRoles}>{discordLoading ? 'Fetching..' : 'Fetch Discord Roles'}</Button>
                                    }
                                    {
                                        discordError !== '' &&
                                        <p>{discordError}</p>
                                    }
                                </Form.Field>
                            </Form.Field>
                        </Form.Group>
                    </Segment>

                    <Divider horizontal>Access Roles</Divider>

                    <Segment>
                        <Form.Group widths='equal'>
                            <Form.Field>
                                <label>BIS ID's to ignore from !top lists</label>
                                <Select
                                    multiple={true}
                                    options={players}
                                    value={ignore}
                                    onChange={(e, {value}) => this.setState({ignore: value})}
                                />
                                <p><small>Select the admin/mod role who should have access to use the !logs command.</small></p>
                            </Form.Field>
                            <Form.Field>
                                <Form.Field>
                                    <label>Fetch the latest list of players</label>
                                    <Button color="blue" disabled={playersLoading} onClick={this.getPlayers}>{playersLoading ? 'Fetching..' : 'Fetch Player List'}</Button>
                                    {
                                        playersError !== '' &&
                                        <p>{playersError}</p>
                                    }
                                </Form.Field>
                            </Form.Field>
                        </Form.Group>
                    </Segment>

                    <div style={{textAlign: 'right'}}>
                        <Button
                            color='green'
                            onClick={this.save}
                            disabled={(isEmpty(logFileDirectories) || isEmpty(discordToken) || isEmpty(discordServerID) || isEmpty(discordChannelID))}
                        >Save & Continue</Button>
                    </div>
                </Form>
            </Container>
        );
    }
};

export default withRouter(connect()(Configure));
