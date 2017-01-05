import Scheduler from './scheduler';
import devtoolsPlugin from './plugins/devtools';

class Store {
	constructor( { modules = {}, actions = {}, plugins = [] } = {} ) {
		Object.assign( this, {
			_state: {},
			_reducers: {},
			_modules: modules,
			_getters: {},
			_actions: actions,
			_plugins: plugins,
			_subscribers: [],
			_viewUpdateSubscribers: [],
			scheduler: new Scheduler(),
		} );

		// register modules
		Object.keys( modules )
			.forEach( name => this.registerModule( name, modules[ name ] ) );

		// execute devtools manually
		devtoolsPlugin()( this );
		// execute other plugins
		plugins.forEach( plugin => this.use( plugin ) );
	}
	use( plugin ) {
		plugin( this );
	}
	replaceState( newState, { silent = false } = {} ) {
		this._state = newState;

		if ( !silent ) {
			this.syncView();
		}
	}
	getState() {
		return this._state;
	}
	getGetters() {
		return this._getters;
	}
	nextTick( fn ) {
		this.scheduler.add( fn );
	}
	dispatch( type, payload ) {
		let action;

		if ( typeof type === 'string' ) {
			action = { type, payload };
		} else if ( isValidMutation( type ) ) {
			action = type;
		} else {
			return console.error( 'invalid dispatch params', arguments );
		}

		const act = this._actions[ action.type ];

		if ( typeof act !== 'function' ) {
			return console.error( 'action', action.type, 'not found' );
		}

		return act( {
			getState: this.getState.bind( this ),
			state: this.getState(),
			get: key => {
				const getters = this.getGetters();
				const getterFn = getters[ key ];
				if ( typeof getterFn !== 'function' ) {
					return;
				}

				return getterFn( this.getState() );
			},
			commit: this.commit.bind( this ),
			dispatch: this.dispatch.bind( this ),
			nextTick: this.nextTick.bind( this ),
		}, action.payload );
	}
	commit( type, payload ) {
		let mutation;

		// e.g. mutation -> { type: 'foo', payload: 'bar' }
		if ( typeof type === 'string' ) {
			mutation = { type, payload };
		} else if ( isValidMutation( type ) ) {
			mutation = type;
		} else {
			return console.error( 'invalid commit params', arguments );
		}

		const reducer = this._reducers[ mutation.type ];
		if ( typeof reducer === 'function' ) {
			const state = this.getState();
			const moduleState = typeof reducer.key === 'undefined' ? state : state[ reducer.key ];

			reducer( moduleState, mutation.payload );

			// notify subscribers state has been changed
			this._applySubscribers( mutation, state );

			this.scheduler.run( () => this.syncView() );
		} else {
			console.error( 'reducer', mutation.type, 'not found' );
		}
	}
	syncView() {
		this._host.$update();
		this._viewUpdateSubscribers.forEach( fn => fn() );
	}
	host( target ) {
		this._host = target;
	}
	subscribe( fn ) {
		if ( typeof fn !== 'function' ) {
			return;
		}

		this._subscribers.push( fn );
	}
	subscribeViewUpdate( fn ) {
		if ( typeof fn !== 'function' ) {
			return;
		}

		this._viewUpdateSubscribers.push( fn );
	}
	registerModule( name = '', module = {} ) {
		if ( !name ) {
			return console.error( 'Please provide a name when register module' );
		}

		// attach module state to root state
		this._state[ name ] = module.state || {};

		let reducers = module.reducers || {};
		for ( let j in reducers ) {
			reducers[ j ].key = name;
		}

		reducers = addNSForReducers( reducers, name );

		// attach module reducers to root reducers
		Object.assign( this._reducers, reducers );
	}
	registerActions( actions = {} ) {
		Object.assign( this._actions, actions );
	}
	registerGetters( getters = {} ) {
		Object.assign( this._getters, getters );
	}
	_applySubscribers( mutation, state ) {
		const subscribers = this._subscribers;

		for ( let i = 0, len = subscribers.length; i < len; i++ ) {
			const subscriber = subscribers[ i ];
			subscriber( mutation, state );
		}
	}
}

function addNSForReducers( reducers, ns ) {
	const tmp = {};
	Object.keys( reducers ).forEach( key => {
		tmp[ `${ ns }/${ key }` ] = reducers[ key ];
	} );
	return tmp;
}

function isValidMutation( mutation ) {
	return typeof mutation.type !== 'undefined';
}

function isStore( ins ) {
	return ins && ins instanceof Store;
}

export default Store;
export { isStore };
