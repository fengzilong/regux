(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.regux = factory());
}(this, (function () { 'use strict';

var handleComputed = ( function () {
	// wrap the computed getter;
	function wrapGet( get ) {
		return function ( context ) {
			return get.call( context, context.data );
		};
	}
	// wrap the computed setter;
	function wrapSet( set ) {
		return function ( context, value ) {
			set.call( context, value, context.data );
			return value;
		};
	}

	return function ( computed ) {
		if ( !computed ) {
			return;
		}
		var parsedComputed = {};
		var handle, pair, type;
		for ( var i in computed ) {
			handle = computed[ i ];
			type = typeof handle;

			if ( handle.type === 'expression' ) {
				parsedComputed[ i ] = handle;
				continue;
			}
			if ( type !== 'string' ) {
				pair = parsedComputed[ i ] = { type: 'expression' };
				if ( type === 'function' ) {
					pair.get = wrapGet( handle );
				} else {
					if ( handle.get ) {
						pair.get = wrapGet( handle.get );
					}
					if ( handle.set ) {
						pair.set = wrapSet( handle.set );
					}
				}
			}
		}
		return parsedComputed;
	};
} )();

// generate computed properties from getters
var makeComputed = function ( target, getters ) {
	Object.assign( target.computed || {}, handleComputed( getters ) );
};

// Credits: vue/vuex

var devtoolsPlugin = function () { return function (store) {
	var devtools = window.__REO_DEVTOOLS_HOOK__;

	if ( !devtools ) {
		return;
	}

	store._devtools = devtools;

	devtools.emit( 'reo:init', store );
	devtools.on( 'reo:travel-to-state', function (state) {
		store.replaceState( state );
	} );
	devtools.on( 'reo:silent-travel-to-state', function (state) {
		store.replaceState( state, {
			silent: true
		} );
	} );

	store.subscribe( function ( action, state ) {
		devtools.emit( 'reo:reducer', action, state );
	} );

	store.subscribeViewUpdate( function () {
		devtools.emit( 'reo:view-updated' );
	} );
}; };

var Store = function Store( ref ) {
	var this$1 = this;
	if ( ref === void 0 ) ref = {};
	var modules = ref.modules; if ( modules === void 0 ) modules = {};
	var actions = ref.actions; if ( actions === void 0 ) actions = {};
	var plugins = ref.plugins; if ( plugins === void 0 ) plugins = [];

	Object.assign( this, {
		_state: {},
		_reducers: {},
		_modules: modules,
		_getters: {},
		_actions: actions,
		_plugins: plugins,
		_subscribers: [],
		_viewUpdateSubscribers: [],
		_queue: [],
		_updateTid: null,
	} );

	Object.keys( modules )
		.forEach( function (name) { return this$1.registerModule( name, modules[ name ] ); } );

	// execute plugins
	devtoolsPlugin()( this );
	plugins.forEach( function (plugin) { return this$1.use( plugin ); } );
};
Store.prototype.use = function use ( plugin ) {
	plugin( this );
};
Store.prototype.replaceState = function replaceState ( newState, ref ) {
		if ( ref === void 0 ) ref = {};
		var silent = ref.silent; if ( silent === void 0 ) silent = false;

	this._state = newState;

	if ( !silent ) {
		this.updateView();
	}
};
Store.prototype.getState = function getState () {
	return this._state;
};
Store.prototype.getGetters = function getGetters () {
	return this._getters;
};
// watch( getter, cb, options ) {
//
// }
Store.prototype.nextTick = function nextTick () {
		var args = [], len = arguments.length;
		while ( len-- ) args[ len ] = arguments[ len ];

	return this.queue.apply( this, args );
};
Store.prototype.queue = function queue ( fn ) {
	this._queue.push( fn );
};
Store.prototype.dequeue = function dequeue () {
	var queue = this._queue;
	queue.forEach( function (v) {
		if ( typeof v === 'function' ) {
			v();
		}
	} );
	this._queue.length = 0;
};
Store.prototype.dispatch = function dispatch ( type, payload ) {
		var this$1 = this;

	var action;

	if ( typeof type === 'string' ) {
		action = { type: type, payload: payload };
	} else if ( isValidMutation( type ) ) {
		action = type;
	} else {
		return console.error( 'invalid dispatch params', arguments );
	}

	var act = this._actions[ action.type ];

	if ( typeof act !== 'function' ) {
		return console.error( 'action', action.type, 'not found' );
	}

	return act( {
		getState: this.getState.bind( this ),
		state: this.getState(),
		get: function (key) {
			var getters = this$1.getGetters();
			var getterFn = getters[ key ];
			if ( typeof getterFn !== 'function' ) {
				return;
			}

			return getterFn( this$1.getState() );
		},
		commit: this.commit.bind( this ),
		dispatch: this.dispatch.bind( this ),
		nextTick: this.nextTick.bind( this ),
	}, action.payload );
};
Store.prototype.commit = function commit ( type, payload ) {
		var this$1 = this;

	var mutation;

	if ( typeof type === 'string' ) {
		mutation = { type: type, payload: payload };
	} else if ( isValidMutation( type ) ) {
		mutation = type;
	} else {
		return console.error( 'invalid commit params', arguments );
	}

	// mutation -> { type: 'foo', payload: 'bar' }

	var reducer = this._reducers[ mutation.type ];
	if ( typeof reducer === 'function' ) {
		var state = this.getState();
		var moduleState = typeof reducer.key === 'undefined' ? state : state[ reducer.key ];

		reducer( moduleState, mutation.payload );

		// notify subscribers that state has been changed
		this._applySubscribers( mutation, state );

		// try to update view
		if ( this._updateTid ) {
			clearTimeout( this._updateTid );
		}

		this._updateTid = setTimeout( function () {
			this$1.updateView();
			this$1.dequeue();
		}, 0 );
	} else {
		console.error( 'reducer', mutation.type, 'not found' );
	}
};
Store.prototype.updateView = function updateView () {
	this._host.$update();
	this._viewUpdateSubscribers.forEach( function (fn) { return fn(); } );
};
Store.prototype.host = function host ( target ) {
	this._host = target;
};
Store.prototype.subscribe = function subscribe ( fn ) {
	if ( typeof fn !== 'function' ) {
		return;
	}

	this._subscribers.push( fn );
};
Store.prototype.subscribeViewUpdate = function subscribeViewUpdate ( fn ) {
	if ( typeof fn !== 'function' ) {
		return;
	}

	this._viewUpdateSubscribers.push( fn );
};
Store.prototype.registerModule = function registerModule ( name, module ) {
		if ( name === void 0 ) name = '';
		if ( module === void 0 ) module = {};

	if ( !name ) {
		return console.error( 'Please provide a name when register module' );
	}

	// attach module state to root state
	this._state[ name ] = module.state || {};

	var reducers = module.reducers || {};
	for ( var j in reducers ) {
		reducers[ j ].key = name;
	}
	reducers = addNSForReducers( reducers, name );
	// attach module reducers to root reducers
	Object.assign( this._reducers, reducers );
};
Store.prototype.registerActions = function registerActions ( actions ) {
		if ( actions === void 0 ) actions = {};

	Object.assign( this._actions, actions );
};
Store.prototype.registerGetters = function registerGetters ( getters ) {
		if ( getters === void 0 ) getters = {};

	Object.assign( this._getters, getters );
};
Store.prototype._applySubscribers = function _applySubscribers ( mutation, state ) {
	var subscribers = this._subscribers;

	for ( var i = 0, len = subscribers.length; i < len; i++ ) {
		var subscriber = subscribers[ i ];
		subscriber( mutation, state );
	}
};

function addNSForReducers( reducers, ns ) {
	var tmp = {};
	Object.keys( reducers ).forEach( function (key) {
		tmp[ (ns + "/" + key) ] = reducers[ key ];
	} );
	return tmp;
}

function isValidMutation( mutation ) {
	return typeof mutation.type !== 'undefined';
}

function isStore( ins ) {
	return ins && ins instanceof Store;
}

/* eslint-disable no-loop-func */

var regux = function (Component) {
	// one store in Component scope
	var store;
	Component.implement( {
		events: {
			$config: function $config() {
				if ( isStore( this.store ) ) {
					if ( store ) {
						// store already exists
						console.groupCollapsed( 'store already exists' );
						console.log( 'old store:', store );
						console.log( 'new store:', this.store );
						console.groupEnd( 'store already exists' );
						console.warn( 'old store will be used' );
					} else {
						// save store
						store = this.store;
						store.host( this );
						delete this.store;
					}
				}

				if ( !store ) {
					return console.error( 'store not found' );
				}

				this.$store = store;
				this.commit = store.commit.bind( store );
				this.dispatch = store.dispatch.bind( store );
				this.nextTick = store.nextTick.bind( store );

				var commonGetters = store.getGetters();

				var ref = this;
				var getters = ref.getters; if ( getters === void 0 ) getters = {};
				Object.keys( getters ).forEach( function (key) {
					var getter = getters[ key ];

					// if getter is string, try getting it from commonGetters
					if ( typeof getter === 'string' ) {
						getter = commonGetters[ getter ];
					}

					if ( typeof getter === 'function' ) {
						getters[ key ] = function () {
							return getter( store.getState() );
						};
					}
				} );
				makeComputed( this, getters );
			}
		}
	} );
};

regux.Store = Store;

return regux;

})));
