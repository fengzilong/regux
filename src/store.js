// mutationType is unique in global scope
// which is defined in one file
// named constants.js in Redux, mutation-types.js in vuex
class Store {
	constructor( { state = {}, reducers = {}, modules = {}, actions = {}, plugins = [], autoUpdate = true } = {} ) {
		Object.assign( this, {
			_mutations: reducers,
			_modules: modules,
			_actions: actions,
			_plugins: plugins,
			_autoUpdate: autoUpdate,
			_subscribers: [],
			_queue: [],
			_updateTid: null,
		} );

		Object.defineProperty( this, 'state', {
			get() {
				return state;
			},
			set() {
				throw new Error( 'cannot set state directly' );
			},
		} );

		for ( let i in modules ) {
			const module = modules[ i ];
			const moduleState = module.state || {};
			let moduleMutations = module.reducers || {};
			state[ i ] = moduleState;
			for ( let j in moduleMutations ) {
				moduleMutations[ j ].key = i;
			}
			moduleMutations = addNSForMutation( moduleMutations, i );
			Object.assign( this._mutations, moduleMutations );
			console.log( this._mutations );
		}

		function addNSForMutation( mutations, ns ) {
			const tmp = {};
			Object.keys( mutations ).forEach( key => {
				tmp[ `${ ns }/${ key }` ] = mutations[ key ];
			} );
			return tmp;
		}

		// execute plugins
		for ( let i = 0, len = plugins.length; i < len; i++ ) {
			let plugin = plugins[ i ];
			plugin( this );
		}
	}
	// watch( getter, cb, options ) {
	//
	// }
	nextTick( ...args ) {
		return this.queue.apply( this, args );
	}
	queue( fn ) {
		this._queue.push( fn );
		return this;
	}
	dequeue() {
		const queue = this._queue;
		queue.forEach( v => {
			if ( typeof v === 'function' ) {
				v();
			}
		} );
		this._queue.length = 0;
		return this;
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

		if ( typeof act === 'function' ) {
			return act.call( this, action.payload );
		} else {
			console.error( 'action', action.type, 'not found' );
		}
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

		const mutate = this._mutations[ mutation.type ];
		if ( typeof mutate === 'function' ) {
			let state = typeof mutate.key === 'undefined' ? this.state : this.state[ mutate.key ];

			mutate( state, mutation.payload );

			this._applySubscribers( mutation, this.state );

			if ( this._autoUpdate ) {
				if ( this._updateTid ) {
					clearTimeout( this._updateTid );
				}
				this._updateTid = setTimeout( () => {
					this.updateView();
					this.dequeue();
				}, 0 );
			}
		} else {
			console.error( 'reducer', mutation.type, 'not found' );
		}

		return this;
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

		return this;
	}
	_applySubscribers( mutation, state ) {
		const subscribers = this._subscribers;

		for ( let i = 0, len = subscribers.length; i < len; i++ ) {
			const subscriber = subscribers[ i ];
			subscriber( mutation, state );
		}
	}
}

function isValidMutation( mutation ) {
	return typeof mutation.type !== 'undefined';
}

function isStore( ins ) {
	return ins && ins instanceof Store;
}

export default Store;
export { isStore };
