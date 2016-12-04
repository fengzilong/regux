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
			_queue: [],
			_updateTid: null,
		} );

		Object.keys( modules )
			.forEach( name => this.registerModule( name, modules[ name ] ) );

		// execute plugins
		devtoolsPlugin()( this );
		plugins.forEach( plugin => this.use( plugin ) );
	}
	use( plugin ) {
		plugin( this );
	}
	replaceState( newState ) {
		this._state = newState;
		this.updateView();
	}
	getState() {
		return this._state;
	}
	getGetters() {
		return this._getters;
	}
	// watch( getter, cb, options ) {
	//
	// }
	nextTick( ...args ) {
		return this.queue.apply( this, args );
	}
	queue( fn ) {
		this._queue.push( fn );
	}
	dequeue() {
		const queue = this._queue;
		queue.forEach( v => {
			if ( typeof v === 'function' ) {
				v();
			}
		} );
		this._queue.length = 0;
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
			state: this.getState(),
			commit: this.commit.bind( this ),
			dispatch: this.dispatch.bind( this ),
			nextTick: this.nextTick.bind( this ),
		}, action.payload );
	}
	commit( type, payload ) {
		let mutation;

		if ( typeof type === 'string' ) {
			mutation = { type, payload };
		} else if ( isValidMutation( type ) ) {
			mutation = type;
		} else {
			return console.error( 'invalid commit params', arguments );
		}

		// mutation -> { type: 'foo', payload: 'bar' }

		const reducer = this._reducers[ mutation.type ];
		if ( typeof reducer === 'function' ) {
			const state = this.getState();
			const moduleState = typeof reducer.key === 'undefined' ? state : state[ reducer.key ];

			reducer( moduleState, mutation.payload );

			// notify subscribers that state has been changed
			this._applySubscribers( mutation, state );

			// try to update view
			if ( this._updateTid ) {
				clearTimeout( this._updateTid );
			}

			this._updateTid = setTimeout( () => {
				this.updateView();
				this.dequeue();
			}, 0 );
		} else {
			console.error( 'reducer', mutation.type, 'not found' );
		}
	}
	updateView() {
		this._host.$update();
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
	registerModule( name = '', module = {} ) {
		if ( !name ) {
			return console.error( 'Please provide name when register module' );
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
