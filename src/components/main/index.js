import React from 'react';
import {withRouter, NavLink} from 'react-router-dom';
import {connect} from 'react-redux';
import {Button, Container, Segment, Divider} from 'semantic-ui-react';
import storage from 'electron-json-storage';
import Server from '../../watchdog';

class Main extends React.Component {
    state = {
        logs: [],
        muted: false,
        connected: false,
    };

    componentDidMount() {
        storage.get('settings', (error, settings) => {
            // create the server instance
            this.server = new Server(settings);
            // listen for logger output
            this.server.on('console', (log) => {
                const {logs} = this.state;
                this.setState({logs: [...logs, log]});
            });

            // start the server
            this.server.init();
        });
    }

    toggleNotifications = () => {
        this.server.discord.muted = !this.server.discord.muted;
        this.setState({muted: this.server.discord.muted});
    }

    shutdown = async () => {
        await this.server.shutdown();
        this.props.history.push('/');
    }

    render() {
        const {logs} = this.state;

        return (
            <Container className="c-main">
                <Segment placeholder>
                    {
                        logs.map((log, index) => {
                            if (log.component === 'server') {
                                return <Divider key={index} horizontal>{log.msg}</Divider>;
                            }

                            return <p key={index}><strong className="timestamp">[{log.timestamp}]</strong><strong>[{log.component}]</strong>: <span>{log.msg}</span></p>;
                        })
                    }
                </Segment>
                <Button floated='left' color='black' onClick={this.shutdown}>Change Settings (Disconnect)</Button>
                {
                    this.state.muted &&
                    <Button floated='right' color='green' onClick={this.toggleNotifications}>Resume Discord Notifications</Button>
                }
                {
                    !this.state.muted &&
                    <Button floated='right' color='red' onClick={this.toggleNotifications}>Stop Discord Notifications</Button>
                }
            </Container>
        );
    }
};

export default withRouter(connect()(Main));
