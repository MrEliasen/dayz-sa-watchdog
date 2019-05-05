import React from 'react';
import {withRouter} from 'react-router-dom';
import {connect} from 'react-redux';
import {Route, Switch} from 'react-router-dom';
import {bindActionCreators} from 'redux';
import {TransitionGroup, CSSTransition} from 'react-transition-group';

// Views
import Configure from '../configure';
import Main from '../main';

const PageFade = (props) => (
    <CSSTransition
        {...props}
        classNames="fade"
        timeout={500}
        mountOnEnter={true}
        unmountOnExit={true}
    />
);

class App extends React.Component {
    render() {
        const locationKey = this.props.location.pathname;

        return (
            <TransitionGroup className="transition-group">
                <PageFade key={locationKey}>
                    <Switch location={this.props.location}>
                        <Route exact path="/" component={Configure} />
                        <Route exact path="/main" component={Main} />
                    </Switch>
                </PageFade>
            </TransitionGroup>
        );
    }
}

function mapStateToProps(state) {
    return {};
}

function mapDispatchToProps(dispatch) {
    return bindActionCreators({}, dispatch);
}

export default withRouter(connect(mapStateToProps, mapDispatchToProps)(App));
