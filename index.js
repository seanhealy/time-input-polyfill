
if (supportsTime()) {
	document.addEventListener("DOMContentLoaded", function() {
		// var $$timeInputs = _$$('input[type="time"]');
		var $$timeInputs = _$$('input.time');
		$$timeInputs.forEach(element => {
			new TimePolyfill(element);
		});
	});
}

function TimePolyfill($input) {

	var ranges = {
		hrs : { start: 0, end: 2 },
		min : { start: 3, end: 5 },
		mode : { start: 6, end: 8 },
	}

	var segments = Object.keys(ranges);

	initialise();

	function initialise () {
		prevent_user_select();

		if ($input.value === '') {
			apply_default();
		}

		bind_keyboard_events();
	}

	function bind_keyboard_events () {

		$input.onfocus = function () {
			// Always returns [0,0] in webkit browsers :(
			// var position = get_selected_range();
			select_hrs();
		}

		$input.onkeydown = function(e) {
			var keys = {
				ArrowDown: 40,
				ArrowRight: 39,
				ArrowUp: 38,
				ArrowLeft: 37,
				Backspace: 8,
				Tab: 9,
				Shift: 16,
				Escape: 27,
			}

			var numberKeys = [
			// 0,  1,  2,  3,  4,  5,  6,  7,  8,  9
			  48, 49, 50, 51, 52, 53, 54, 55, 56, 57,
				96, 97, 98, 99,100,101,102,103,104,105];

			var is_number_key = numberKeys.indexOf(e.which) > -1;
			var is_named_key = Object.values(keys).indexOf(e.which) > -1;
			var is_arrow_key = [keys.ArrowDown, keys.ArrowRight, keys.ArrowUp, keys.ArrowLeft].indexOf(e.which) > -1;

			if (!is_number_key && !is_named_key || is_arrow_key) { e.preventDefault(); }

			switch (e.which) {
				case keys.ArrowRight: next_segment(); break;
				case keys.ArrowLeft:  prev_segment(); break;
				case keys.ArrowUp:    increment_current_segment(); break;
				case keys.ArrowDown:  decrement_current_segment(); break;
				case keys.Escape:     reset(); break;
			}
		}
	}

	function next_segment () {
		var segment = get_current_segment();
		var next_segment_index = segments.indexOf(segment) + 1;
		var next_segment = segments[next_segment_index] || 'mode';
		select_segment(next_segment);
	}

	function prev_segment () {
		var segment = get_current_segment();
		var next_segment_index = segments.indexOf(segment) - 1;
		var next_segment = next_segment_index < 0 ? 'hrs' : segments[next_segment_index];
		select_segment(next_segment);
	}

	function reset () {
		apply_default();
		select_hrs();
	}

	function apply_default () {
		$input.value = '--:-- --';
	}

	function increment_current_segment (){
		var current_segment = get_current_segment();
		increment(current_segment);
	}

	function decrement_current_segment (){
		var current_segment = get_current_segment();
		decrement(current_segment);
	}

	function increment (segment) {
		if (segment === 'mode') {
			switch_mode('AM')
		} else {
			nudge_time_segment(segment, 'up');
		}
	}

	function decrement (segment) {
		if (segment === 'mode') {
			switch_mode('PM')
		} else {
			nudge_time_segment(segment, 'down');
		}
	}

	function nudge_time_segment (segment, direction) {
		var current_values = get_values();
		var time;

		var modifier = direction === 'up' ? 1 : -1;

		if (current_values[segment] === '--') {
			var current_time = new Date();
			time = {
				hrs: convert_24_hour(current_time.getHours()),
				min: current_time.getMinutes(),
			}
		} else {
			var minutes = {
				up : current_values.min < 59 ? current_values.min + modifier : 0,
				down : current_values.min === 0 ? 59 : current_values.min + modifier,
			}
			time = {
				hrs: convert_24_hour(current_values.hrs + modifier),
				min: minutes[direction],
			}
		}

		set_value(segment, leading_zero(time[segment]) );
	}

	function switch_mode (default_mode) {
		default_mode = default_mode || 'AM';
		var current_mode = get_values().mode;
		var new_mode = {
			'--' : default_mode,
			'AM' : 'PM',
			'PM' : 'AM',
		}[current_mode];
		set_value('mode', new_mode);
	}

	function get_current_segment () {
		var selection = get_selected_range();
		for (var range in ranges) {
			if (is_match(selection, ranges[range])) {
				return range;
			}
		}
		return 'hrs';
	}

	function get_selected_range () {
		return { start: $input.selectionStart, end: $input.selectionEnd };
	}

	function get_selected_value () {
		var current_values = get_values();
		var current_segment = get_current_segment();
		return current_values[current_segment];
	}

	function select_segment (segment) {
		var actions = {
			hrs:  select_hrs,
			min:  select_min,
			mode: select_mode,
		};
		actions[segment]();
	}

	function select_hrs () {
		$input.setSelectionRange(0, 2);
	}
	function select_min () {
		$input.setSelectionRange(3, 5);
	}
	function select_mode () {
		$input.setSelectionRange(6, 8);
	}

	function get_values () {
		var regEx = /([0-9-]{1,2})\:([0-9-]{1,2})\s(AM|PM|\-\-)/;
		var result = regEx.exec($input.value);

		return {
			hrs: convert_number(result[1]),
			min: convert_number(result[2]),
			mode: result[3],
		}
	}

	function convert_number (number) {
		return isNaN(number) ? number : parseInt(number);
	}

	function set_value (segment, value) {
		var values = get_values();
		values[segment] = value;
		var newInputVal = [
			leading_zero(values.hrs),':',
			leading_zero(values.min),' ',
			leading_zero(values.mode)
		].join('');
		$input.value = newInputVal;
		select_segment(segment);
	}

	function is_match (obj1, obj2) {
		var string1 = JSON.stringify(obj1);
		var string2 = JSON.stringify(obj2);
		return string1 == string2;
	}

	function prevent_user_select () {
		$input.style.msUserSelect = "none";
		$input.style.mozUserSelect = "none";
		$input.style.webkitUserSelect = "none";
		$input.style.userSelect = "none";
	}

	function leading_zero (number) {
		if (isNaN(number)) return number;
		var purified = parseInt(number);
		return purified < 10 ? '0' + purified : number;
	}

	function convert_24_hour (hours) {
		return hours <= 12 ? hours === 0 ? 12 : hours : hours - 12;
	}
}

function _$$ (selector) {
	var elements = document.querySelectorAll(selector);
	return Array.prototype.slice.call(elements, 0);
}

// https://stackoverflow.com/a/10199306/1611058
function supportsTime () {
	var input = document.createElement('input');
	input.setAttribute('type','time');

	var notValid = 'not-a-time';
	input.setAttribute('value', notValid);

	return (input.value !== notValid);
}