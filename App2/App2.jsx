/*global -React */
var React = require('react');
//var M = require('mori');
var stateStream = require('../stateStream');
var easingTypes = require('../easingTypes');
var tweenMixin = require('./tweenMixin');
var update = require('react/lib/update');

var RxReact = require('rx-react/browser');
var Rx = require('rx');
require('../rx-dom');
var ease = easingTypes.easeInOutQuad;

var App2 = React.createClass({
  mixins: [RxReact.StateStreamMixin, tweenMixin],
  getStateStream: function() {
    
    this.handleClick = RxReact.EventHandler.create();
    var self = this;
    return Rx.Observable.of({
      blockX: [0, 0, 0],
      goingLeft: false,
    })
    .concat(
      this.handleClick
      .flatMapLatest(function () {
        var duration = 1000;
        var frameCount = stateStream.toFrameCount(duration);
        var initState = self.state;
        var start = initState.goingLeft ? 400 : 0;
        var dest = initState.goingLeft ? 0 : 400;

        return Rx.Observable.range(0, frameCount, Rx.Scheduler.requestAnimationFrame)
        .map(function (i) {
          var ms = stateStream.toMs(i);
          return {
            blockX: {
              0: {
                $set: ease(ms, start, dest, duration)
              },
              1: {
                $set: ease(ms, initState.blockX[1], dest, duration)
              },
              2: {
                $set: ease(ms, initState.blockX[2], dest, duration)
              }
            },
            goingLeft: {
              $set: !initState.goingLeft
            }
          };
        });
      })
      .map(function (spec) {
        return update(self.state, spec);
      })
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

    var val = this.getAdditiveValue(['blockX', 2]);
    var s3 = {
      border: '1px solid gray',
      borderRadius: '10px',
      display: 'inline-block',
      padding: 20,
      position: 'absolute',
      top: 110,
      WebkitTransform: 'translate3d(' + val + 'px,0,0)',
      transform: 'translate3d(' + val + 'px,0,0)',
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
