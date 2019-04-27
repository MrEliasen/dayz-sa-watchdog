import React from 'react';
import ReactDOM from 'react-dom';
import {Provider} from 'react-redux';
import {createStore, applyMiddleware, compose} from 'redux';
import {HashRouter} from 'react-router-dom';
import ReduxPromise from 'redux-promise';

import reducers from './reducers';
import App from './components/app/app';

// browser redux development tools enabled (does not work on mobile)
const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;
const store = createStore(
    reducers,
    composeEnhancers(
        applyMiddleware(ReduxPromise)
    )
);

// Production & mobile tests
//const createStoreWithMiddleware = applyMiddleware(ReduxPromise)(createStore);
//const store = createStoreWithMiddleware(reducers);

ReactDOM.render(
    <Provider store={store}>
        <HashRouter>
            <App/>
        </HashRouter>
    </Provider>,
    document.querySelector('#app')
);
