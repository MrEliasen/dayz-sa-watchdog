import {combineReducers} from 'redux';
import {routerReducer} from 'react-router-redux';

//import AppReducer from './components/app/reducer';

const rootReducer = combineReducers({
    routing: routerReducer,
});

export default rootReducer;
