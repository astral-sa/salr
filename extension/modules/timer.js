/*

	Timer functions

*/

Cu.import("resource://gre/modules/Timer.jsm");

let {Prefs} = require("prefs");

let Timer = exports.Timer =
{
	timerPageCount: 0,
	_TimerValue: 0,
	_TimerValueSaveAt: 0,
	_TimerValueLoaded: false,
	_LastTimerPing: 0,
	intervalId: null,

	init: function()
	{
		// Get Initial Timer Value
		try { this._TimerValue = Prefs.getPref("timeSpentOnForums"); } catch(xx) { }
		if ( ! this._TimerValue ) {
			this._TimerValue = 0;
		}
		this._TimerValueSaveAt = this._TimerValue + 60;
		this._TimerValueLoaded = true;

		// Set interval for 'Time spent on forums'
		Timer.intervalId = setInterval(Timer.timerTick, 1000);
		onShutdown.add(function() { clearInterval(Timer.intervalId); });
	},

	PingTimer: function()
	{
		var nowtime = (new Date()).getTime();
		if ( this._LastTimerPing < nowtime-1000 ) {
			this._TimerValue++;
			this._LastTimerPing = nowtime;
			if ( this._TimerValue >= this._TimerValueSaveAt ) {
				this.SaveTimerValue();
			}
		}
	},

	timerTick: function()
	{
		if (Timer.timerPageCount > 0)
		{
			Timer.PingTimer();
		}
	},

	// Saves the time spent on the forums so far and flags to save in another 60 seconds
	// @param: nothing
	// @return: nothing
	SaveTimerValue: function()
	{
		if (this._TimerValueLoaded)
		{
			Prefs.setPref("timeSpentOnForums", this._TimerValue);
		}
		this._TimerValueSaveAt = this._TimerValue + 60;
	},

};
Timer.init();
