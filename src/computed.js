const handleComputed = (function(){
	// wrap the computed getter;
	function wrapGet(get){
		return function(context){
			return get.call(context, context.data );
		}
	}
	// wrap the computed setter;
	function wrapSet(set){
		return function(context, value){
			set.call( context, value, context.data );
			return value;
		}
	}

	return function(computed){
		if(!computed) return;
		var parsedComputed = {}, handle, pair, type;
		for(var i in computed){
			handle = computed[i]
			type = typeof handle;

			if(handle.type === 'expression'){
				parsedComputed[i] = handle;
				continue;
			}
			if( type === "string" ){
				parsedComputed[i] = parse.expression(handle)
			}else{
				pair = parsedComputed[i] = {type: 'expression'};
				if(type === "function" ){
					pair.get = wrapGet(handle);
				}else{
					if(handle.get) pair.get = wrapGet(handle.get);
					if(handle.set) pair.set = wrapSet(handle.set);
				}
			}
		}
		return parsedComputed;
	}
})();

// generate computed properties from getters
const makeComputed = ( target, getters ) {
	Object.assign( target.computed || {}, computed( getters ) );
};

export default makeComputed;
