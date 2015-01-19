/*global -React */
var React = require('react');
var stateStream = require('../stateStream');
var easingTypes = require('../easingTypes');

var RxReact = require('rx-react/browser');
var Rx = require('rx');
require('../rx-dom');
var ease = easingTypes.easeInOutQuad;


function createTimeLine(duration) {
  var frameCount = stateStream.toFrameCount(duration);
  return Rx.Observable.range(0, frameCount, Rx.Scheduler.requestAnimationFrame)
  .map(function (i) {
    return stateStream.toMs(i);
  });
}



Rx.Observable.prototype.flatMapCombine= function (mapFn, selectorResult) {
  var source = this;
  return new Rx.AnonymousObservable(function (o) {
    var observables = {};
    var values = {};
    var mainSubscription;
    var observableSubscriptions = {};
    
    function getValues() {
      return Object.keys(values)
      .sort(function (a, b) { return a - b; })
      .reduce(function (res, key) {
        res.push(values[key]);
        return res;
      }, []);
    }
    
    var count = 0;
    mainSubscription = source.subscribe(function (value) {
      var i = count++;
      var obs;
      try {
        obs = mapFn(value, i, source);
      }  catch (e) {
        o.onError(e);
        return;
      }
      observables[i] = obs;

      observableSubscriptions[i] = 
        obs.subscribe( function (value) {
          values[i] = value;
          var result;
          try {
            result = selectorResult(getValues());
          } catch(e) {
            o.onError(e);
            return;
          }
          o.onNext(result);
        }, function (e) {
          o.onError(e);
        }, function () {
          delete observables[i];
          delete values[i];
        });
    }, function (e) { 
      o.onError(e); 
    }, function () {
      o.onCompleted();
    });
    
    return Rx.Disposable.create(function () {
      mainSubscription.dispose();
      Object.keys(observableSubscriptions).forEach(function (i) {
        observableSubscriptions[i].dispose();
      });
      observables = mainSubscription = observableSubscriptions = values = null;
    });
  });
};

var App2 = React.createClass({
  mixins: [RxReact.StateStreamMixin],
  getStateStream: function() {
    
    this.handleClick = RxReact.EventHandler.create();
    
    var self = this;
    
    
    
    var animate = this.handleClick
    .scan(true, function (val) { return !val; })
    .map(function (goingLeft) {
      return {
        start: goingLeft ? 400 : 0,
        dest: goingLeft ? 0 : 400
      };
    });
    var duration = 1000;
    
    var block0 = animate.
    flatMapLatest(function (config) {
      return createTimeLine(duration).map(function (ms) {
        return ease(ms, config.start, config.dest, duration);
      });
    });
    
    
    var block1 = animate.
    flatMapLatest(function (config) {
      var initState = self.state;
      return createTimeLine(duration).map(function (ms) {
        return ease(ms, initState.blockX[1], config.dest, duration);
      });
    });
    
    var block2 = animate
    .flatMapCombine(
      function (config) {
        return createTimeLine(duration).map(function (ms) {
          return {
            dest: config.dest,
            x: -config.dest + ease(ms, config.start, config.dest, duration)
          };
        });
      },
      function (configs) {
        return configs
        .reduce(function (result, config, i) {
          if (i === configs.length -1) {
            result += config.dest;
          }
          return result += config.x;
        }, 0);
      }
    );
    
    
    return Rx.Observable
    .of({ blockX: [0, 0, 0] })
    .concat(
      Rx.Observable.combineLatest(
        block0, block1, block2,
        function (x0, x1, x2) {
          return { blockX: [x0, x1, x2] };
        }
      )
    );
  },


  render: function() {
    var s1 = {
      border: '1px solid gray',
      borderRadius: '10px',
      display: 'inline-block',
      padding: 20,
      position: 'absolute',
      top: 10,
      WebkitTransform: 'translate3d(' + this.state.blockX[0] + 'px,0,0)',
      transform: 'translate3d(' + this.state.blockX[0] + 'px,0,0)',
    };
    var s2 = {
      border: '1px solid gray',
      borderRadius: '10px',
      display: 'inline-block',
      padding: 20,
      position: 'absolute',
      top: 60,
      WebkitTransform: 'translate3d(' + this.state.blockX[1] + 'px,0,0)',
      transform: 'translate3d(' + this.state.blockX[1] + 'px,0,0)',
    };

    var s3 = {
      border: '1px solid gray',
      borderRadius: '10px',
      display: 'inline-block',
      padding: 20,
      position: 'absolute',
      top: 110,
      WebkitTransform: 'translate3d(' + this.state.blockX[2] + 'px,0,0)',
      transform: 'translate3d(' + this.state.blockX[2] + 'px,0,0)',
    };

    return (
      <div style={{height: 180}}>
        <button onClick={this.handleClick}>Click</button>
        <div style={s1}></div>
        <div style={s2}></div>
        <div style={s3}></div>
      </div>
    );
  }
});

module.exports = App2;
