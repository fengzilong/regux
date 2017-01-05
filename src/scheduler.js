export default class Scheduler {
	constructor() {
		this.t = null;
		this.tasks = [];
	}
	add( task ) {
		this.tasks.push( task );
	}
	run( main ) {
		setTimeout( main, 0 );
		this.tasks.forEach( ( task, i ) => {
			if ( typeof task === 'function' ) {
				task();
				this.tasks[ i ] = null;
			}
		} );
		this.tasks.length = 0;
	}
}
