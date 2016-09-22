(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.regux = factory());
}(this, (function () { 'use strict';

var handleComputed = (function(){
	// wrap the computed getter;
	function wrapGet( get ){
		return function( context ){
			return get.call( context, context.data );
		}
	}
	// wrap the computed setter;
	function wrapSet( set ){
		return function( context, value ){
			set.call( context, value, context.data );
			return value;
		}
	}

	return function( computed ) {
		if ( !computed ) { return; }
		var parsedComputed = {}, handle, pair, type;
		for ( var i in computed ) {
			handle = computed[ i ]
			type = typeof handle;

			if ( handle.type === 'expression' ) {
				parsedComputed[ i ] = handle;
				continue;
			}
			if ( type === "string" ) {
				parsedComputed[ i ] = parse.expression( handle )
			} else {
				pair = parsedComputed[ i ] = { type: 'expression' };
				if ( type === "function" ) {
					pair.get = wrapGet( handle );
				} else {
					if( handle.get ) { pair.get = wrapGet( handle.get ); }
					if( handle.set ) { pair.set = wrapSet( handle.set ); }
				}
			}
		}
		return parsedComputed;
	}
})();

// generate computed properties from getters
var makeComputed = function ( target, getters ) {
	Object.assign( target.computed || {}, handleComputed( getters ) );
};

// mutationType is unique in global scope, which is defined in one file, named constants.js in Redux, mutation-types.js in vuex
var Store = function Store( ref ) {
	var this$1 = this;
	if ( ref === void 0 ) ref = {};
	var state = ref.state; if ( state === void 0 ) state = {};
	var mutations = ref.mutations; if ( mutations === void 0 ) mutations = {};
	var modules = ref.modules; if ( modules === void 0 ) modules = {};
	var plugins = ref.plugins; if ( plugins === void 0 ) plugins = [];
	var autoUpdate = ref.autoUpdate; if ( autoUpdate === void 0 ) autoUpdate = true;

	Object.assign( this, {
		_mutations: mutations,
		_modules: modules,
		_plugins: plugins,
		_autoUpdate: autoUpdate,
		_subscribers: []
	} );

	Object.defineProperty( this, 'state', {
		get: function () { return state; },
		set: function () { throw new Error( 'cannot set state directly' ) }
	} );

	for( var i in modules ) {
		var module = modules[ i ];
		var moduleState = module.state || {};
		var moduleMutations = module.mutations || {};
		state[ i ] = moduleState;
		for( var j in moduleMutations ) {
			moduleMutations[ j ].key = i;
		}
		merge( this$1._mutations, moduleMutations );
	}

	// execute plugins
	for( var i$1 = 0, len = plugins.length; i$1 < len; i$1++ ) {
		var plugin = plugins[ i$1 ];
		plugin( this$1 );
	}
};
Store.prototype.watch = function watch ( getter, cb, options ) {

};
Store.prototype.commit = function commit ( mutation ) {
	// TODO: same as dispatch, but will force update
};
Store.prototype.dispatch = function dispatch ( mutation ) {
	// mutation -> { type: 'foo', payload: 'bar' }
	if( !isValidMutationObject( mutation ) ) {
		console.warn( 'invalid mutation', mutation );
		return;
	}

	var mutationType = mutation.type;
	var payload = mutation.payload;
	var mutate = this._mutations[ mutationType ];

	if( typeof mutate === 'function' ) {
		var state = typeof mutate.key === 'undefined'
			? this.state
			: this.state[ mutate.key ];

		mutate( state, mutation );

		this._applySubscribers( mutation, this.state );
			
		// TODO: remove, use commit to force update
		if( this._autoUpdate ) {
			this._host.$update();
		}
	}

	return this;
};
Store.prototype.host = function host ( target ) {
	this._host = target;
};
Store.prototype.subscribe = function subscribe ( fn ) {
	if( typeof fn !== 'function' ) {
		return;
	}

	this._subscribers.push( fn );

	return this;
};
Store.prototype._applySubscribers = function _applySubscribers ( mutation, state ) {
	var subscribers = this._subscribers;

	if( subscribers.length === 0 ) {
		return;
	}

	// TODO: shall we deepClone state?

	for ( var i = 0, len = subscribers.length; i < len; i++ ) {
		var subscriber = subscribers[ i ];
		subscriber( mutation, state );
	}
};

function merge( dest ) {
	var source = [], len$1 = arguments.length - 1;
	while ( len$1-- > 0 ) source[ len$1 ] = arguments[ len$1 + 1 ];

	if ( dest === void 0 ) dest = {};
	var i, j, len;
	for ( i = 0, len = source.length; i < len; i++ ) {
		var src = source[ i ];
		for( j in src ) {
			if( j in dest ) {
				console.warn( ("[merge]: " + j + " already existed, will be overrided") );
			}
			dest[ j ] = src[ j ];
		}
	}
	return dest;
}

function isValidMutationObject( mutation ) {
	return typeof mutation.type !== 'undefined';
}

function isStore( ins ) {
	return ins && ins instanceof Store;
}

var regux = function (Component) {
	// one store in Component scope
	var store;
	Component.implement({
		events: {
			$config: function() {
				var this$1 = this;

				if( isStore( this.store ) ) {
					if( !store ) {
						// get store
						store = this.store;
						store.host( this );
						delete this.store;
					} else {
						// store already exists
						console.group( 'store already exists' );
						console.log( 'old store:', store );
						console.log( 'new store:', this.store );
						console.groupEnd( 'store already exists' );
						console.warn( 'old store will be used' );
					}
				}

				this.$store = store;

				// regux
				var ref = this;
				var regux = ref.regux;
				regux = regux || {};

				// mutations, actions, getters
				var mutations = regux.mutations;
				var actions = regux.actions;
				var getters = regux.getters;
				mutations = mutations || {};
				actions = actions || {};
				getters = getters || {};

				var keys;

				keys = Object.keys( getters );
				var loop = function ( i, len ) {
					var key = keys[ i ];
					var getter = getters[ key ];
					getters[ key ] = function( data ) {
						return getter( store.state );
					};
				};

				for ( var i = 0, len = keys.length; i < len; i++ ) loop( i, len );
				makeComputed( this, getters );

				keys = Object.keys( actions );
				var loop$1 = function ( i, len ) {
					var key$1 = keys[ i ];
					var action = actions[ key$1 ];
					this$1[ key$1 ] = function() {
						var args = [], len = arguments.length;
						while ( len-- ) args[ len ] = arguments[ len ];

						return action.apply( this, [ store ].concat( args ) );
					};
				};

				for ( var i$1 = 0, len$1 = keys.length; i$1 < len$1; i$1++ ) loop$1( i$1, len$1 );
			}
		}
	})
};

regux.Store = Store;

return regux;

})));
