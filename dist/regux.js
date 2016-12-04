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

// mutationType is unique in global scope
// which is defined in one file
// named constants.js in Redux, mutation-types.js in vuex
var Store = function Store( ref ) {
	var this$1 = this;
	if ( ref === void 0 ) ref = {};
	var state = ref.state; if ( state === void 0 ) state = {};
	var reducers = ref.reducers; if ( reducers === void 0 ) reducers = {};
	var modules = ref.modules; if ( modules === void 0 ) modules = {};
	var actions = ref.actions; if ( actions === void 0 ) actions = {};
	var plugins = ref.plugins; if ( plugins === void 0 ) plugins = [];
	var autoUpdate = ref.autoUpdate; if ( autoUpdate === void 0 ) autoUpdate = true;

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
		get: function get() {
			return state;
		},
		set: function set() {
			throw new Error( 'cannot set state directly' );
		},
	} );

	for ( var i in modules ) {
		var module = modules[ i ];
		var moduleState = module.state || {};
		var moduleMutations = module.reducers || {};
		state[ i ] = moduleState;
		for ( var j in moduleMutations ) {
			moduleMutations[ j ].key = i;
		}
		moduleMutations = addNSForMutation( moduleMutations, i );
		Object.assign( this$1._mutations, moduleMutations );
		console.log( this$1._mutations );
	}

	function addNSForMutation( mutations, ns ) {
		var tmp = {};
		Object.keys( mutations ).forEach( function (key) {
			tmp[ (ns + "/" + key) ] = mutations[ key ];
		} );
		return tmp;
	}

	// execute plugins
	for ( var i$1 = 0, len = plugins.length; i$1 < len; i$1++ ) {
		var plugin = plugins[ i$1 ];
		plugin( this$1 );
	}
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
	return this;
};
Store.prototype.dequeue = function dequeue () {
	var queue = this._queue;
	queue.forEach( function (v) {
		if ( typeof v === 'function' ) {
			v();
		}
	} );
	this._queue.length = 0;
	return this;
};
Store.prototype.dispatch = function dispatch ( type, payload ) {
	var action;

	if ( typeof type === 'string' ) {
		action = { type: type, payload: payload };
	} else if ( isValidMutation( type ) ) {
		action = type;
	} else {
		return console.error( 'invalid dispatch params', arguments );
	}

	var act = this._actions[ action.type ];

	if ( typeof act === 'function' ) {
		return act.call( this, action.payload );
	} else {
		console.error( 'action', action.type, 'not found' );
	}
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

	var mutate = this._mutations[ mutation.type ];
	if ( typeof mutate === 'function' ) {
		var state = typeof mutate.key === 'undefined' ? this.state : this.state[ mutate.key ];

		mutate( state, mutation.payload );

		this._applySubscribers( mutation, this.state );

		if ( this._autoUpdate ) {
			if ( this._updateTid ) {
				clearTimeout( this._updateTid );
			}
			this._updateTid = setTimeout( function () {
				this$1.updateView();
				this$1.dequeue();
			}, 0 );
		}
	} else {
		console.error( 'reducer', mutation.type, 'not found' );
	}

	return this;
};
Store.prototype.updateView = function updateView () {
	this._host.$update();
};
Store.prototype.host = function host ( target ) {
	this._host = target;
};
Store.prototype.subscribe = function subscribe ( fn ) {
	if ( typeof fn !== 'function' ) {
		return;
	}

	this._subscribers.push( fn );

	return this;
};
Store.prototype._applySubscribers = function _applySubscribers ( mutation, state ) {
	var subscribers = this._subscribers;

	for ( var i = 0, len = subscribers.length; i < len; i++ ) {
		var subscriber = subscribers[ i ];
		subscriber( mutation, state );
	}
};

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
				this.nextTick = store.queue.bind( store );

				// regux
				var ref = this;
				var getters = ref.getters; if ( getters === void 0 ) getters = {};

				var keys;

				keys = Object.keys( getters );
				var loop = function ( i, len ) {
					var key = keys[ i ];
					var getter = getters[ key ];
					getters[ key ] = function () {
						return getter( store.state );
					};
				};

				for ( var i = 0, len = keys.length; i < len; i++ ) loop( i, len );
				// TODO: 从state获取的getters依赖，脏值检查一轮就可以全部稳定下来，需要考虑下是否有必要使用计算属性
				makeComputed( this, getters );
			}
		}
	} );
};

regux.Store = Store;

return regux;

})));
