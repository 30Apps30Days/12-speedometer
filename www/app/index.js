'use strict';

function noop() {}

// From: https://github.com/lodash/lodash/blob/master/shuffle.js
function shuffle(array) {
  var length = array == null ? 0 : array.length;
  if (!length) { return []; }

  var index = -1;
  var lastIndex = length - 1;
  var result = array;
  while (++index < length) {
    var rand = index + Math.floor(Math.random() * (lastIndex - index + 1));
    var value = result[rand];
    result[rand] = result[index];
    result[index] = value;
  }
  return result
}

function bindEvents(thisArg, events) {
   Object.keys(events).forEach(function (selector) {
        Object.keys(events[selector]).forEach(function (event) {
            var handler = events[selector][event].bind(thisArg);
            if('document' === selector) {
                document.addEventListener(event, handler, false);
            } else if ('window' === selector) {
                window.addEventListener(event, handler, false);
            } else {
                document.querySelectorAll(selector).forEach(function (dom) {
                    dom.addEventListener(event, handler, false);
                });
            }
        });
    }); // all events bound
}


function f(name, params) {
  params = Array.prototype.slice.call(arguments, 1, arguments.length);
  return name + '(' + params.join(', ') + ')';
}

Number.prototype.toRad = Number.prototype.toRad || function() {
  return this * Math.PI / 180;
};


// From: http://www.ridgesolutions.ie/index.php/2013/11/14/algorithm-to-calculate-speed-from-two-gps-latitude-and-longitude-points-and-time-difference/
function metersPerSecond(pos1, pos2) {
  var t1 = pos1.timestamp;
  var lat1 = pos1.coords.latitude.toRad();
  var lon1 = pos1.coords.longitude.toRad();

  var t2 = pos2.timestamp;
  var lat2 = pos2.coords.latitude.toRad();
  var lon2 = pos2.coords.longitude.toRad();

  var r = 6378100; // Earth's radius in meters

  // P
  var rho1 = r * Math.cos(lat1);
  var z1 = r * Math.sin(lat1);
  var x1 = rho1 * Math.cos(lon1);
  var y1 = rho1 * Math.sin(lon1);

  // Q
  var rho2 = r * Math.cos(lat2);
  var z2 = r * Math.sin(lat2);
  var x2 = rho2 * Math.cos(lon2);
  var y2 = rho2 * Math.sin(lon2);

  var dot = x1 * x2 + y1 * y2 + z1 * z2;
  var cos_theta = dot / (r * r);
  var theta = Math.acos(cos_theta);

  return (r * theta) / ((t2 - t1) / 1000);
}


var IS_CORDOVA = !!window.cordova;

var CONVERT = { // from meters per second
  'mph': 2.23694,
  'kph': 3.6
};

var app = {
  // options
  DATA_KEY: 'org.metaist.speedometer.data',
  store: null,
  options: {
    units: 'mph',
    interval: 900,
    timeout: 10 * 1000, // 10 sec
    btf: false,
    btf_trigger: 88 * 0.44704, // 88 MPH
    debug: true
  },

  // internal
  speed: null,
  pos: [],
  watch: null,

  sleep: new Date().getTime(),
  idx: 0,
  CLIPS: shuffle([
    'jigowatts-1.mp4',
    'jigowatts-2.mp4',
    'jigowatts-3.mp4',
    'jigowatts-4.mp4',
    'roads.mp4'
  ]),

  // DOM
  $speed: null,
  $units: null,
  $video: null,
  $chk_btf: null,

  init: function () {
    bindEvents(this, {
      'document': {'deviceready': this.ready},
      'form input': {'change': this.change},
      'video': {'ended': this.next}
    });

    if(!IS_CORDOVA) {
      this.options.debug && console.log('NOT cordova');
      bindEvents(this, {'window': {'load': this.ready}});
    }

    return this;
  },

  ready: function () {
    // Store DOM nodes
    this.$speed = document.querySelector('#speed');
    this.$units = document.querySelector('#units');
    this.$video = document.querySelector('video');
    this.$chk_btf = document.querySelector('#btf');

    // Grab preferences
    if(IS_CORDOVA) {
      this.store = plugins.appPreferences;
      this.store.fetch(this.DATA_KEY).then(function (data) {
        Object.assign(this.options, data || {});

        this.$chk_btf.parentElement
            .MaterialCheckbox[this.options.btf ? 'check' : 'uncheck']();

        document.querySelector('#units-' + this.options.units)
                .parentElement.MaterialRadio.check();
        this.render();
      }.bind(this));
    }

    return this.next()
               .start();
  },

  change: function () {
    this.options.btf = this.$chk_btf.checked;
    this.options.units =
      document.querySelector('[name="opt-units"]:checked').value;

    if (IS_CORDOVA) {
      this.store.store(noop, noop, this.DATA_KEY, this.options);
    }//end if: options stored
    return this.render();
  },

  reset: function () {
    this.options.debug && console.log('.reset()');
    this.idx = 0;
    this.CLIPS = shuffle(this.CLIPS);
    return this;
  },

  next: function () {
    this.options.debug && console.log('.next()');
    this.idx++;
    if (this.idx >= this.CLIPS.length) { this.reset(); }

    this.$video.style.display = 'none';
    this.$video.src = 'lib/movieclips/' + this.CLIPS[this.idx];
    this.$video.load();
    return this;
  },

  play: function () {
    var now = new Date().getTime();
    if (now < this.sleep) { return this; } // too early
    this.$video.style.display = 'initial';
    this.$video.play();
    this.sleep = now + this.options.timeout;
    return this;
  },

  render: function () {
    this.$units.innerText = this.options.units.toUpperCase();
    if(null === this.speed) {
      this.$speed.innerHTML = '&mdash;';
    } else {
      this.$speed.innerText =
        Math.trunc(this.speed * CONVERT[this.options.units]);
    }//end if: update speed
    return this;
  },

  start: function () {
    this.options.debug && console.log('.start()');
    if(this.watch) { this.stop(); }
    this.watch = navigator.geolocation.watchPosition(this.tick.bind(this),
    function (err) { // error handler
      console.error(err);
      this.speed = null;
    }.bind(this),
    { // options
      maximumAge: this.options.interval,
      timeout: this.options.timeout,
      enableHighAccuracy: true
    });

    return this.render();
  },

  tick: function (data) {
    this.options.debug && console.log('.tick()', data);
    this.speed = data.coords.speed;
    if(null === this.speed) {
      this.pos.push(data); // push to end
      if(this.pos.length >= 2) {
        this.speed = metersPerSecond(this.pos[0], this.pos[1]);
        this.pos.shift(); // pop from front
      }//end if: average positions
    }//end if: fallback

    if(this.options.btf &&
       this.speed >= Math.floor(this.options.btf_trigger) &&
       this.speed <= Math.ceil(this.options.btf_trigger)) {
      this.play();
    }//end if: interruption

    return this.render();
  },

  stop: function () {
    this.options.debug && console.log('stop()');
    if(this.watch) {
      navigator.geolocation.clearWatch(this.watch);
      this.watch = null;
      this.speed = null;
      this.pos = [];
    }
    return this.render();
  }
};

app.init();
