/*global -React */
var React = require('react');
//var M = require('mori');
//var stateStream = require('./stateStream');

var RxReact = require('rx-react/browser');
var Rx = require('rx');
require('./rx-dom');

var Child = React.createClass({
  mixins: [RxReact.StateStreamMixin],
  getStateStream: function() {
    var self = this;
    
    return Rx.Observable.generate(
      0,
      function () { return true; },
      function (deg) {
        return deg + 2 * (self.props.turnLeft ? -1 : 3);
      },
      function (deg) {
        return {deg: deg};
      },
      Rx.Scheduler.requestAnimationFrame
    );
  },

  render: function() {
    // turn right 3 times faster to offset parent turning left. Just visual nits
    var state = this.state || {deg: 0};
    
    var s = {
      border: '1px solid gray',
      borderRadius: '20px',
      display: 'inline-block',
      padding: 18,
      WebkitTransform: 'rotate(' + state.deg + 'deg)',
      transform: 'rotate(' + state.deg + 'deg)',
    };
    return (
      <div style={s}>
        asd
      </div>
    );
  }
});

var App1 = React.createClass({
  mixins: [RxReact.StateStreamMixin],
  getStateStream: function() {
    
    this.handleClick = RxReact.EventHandler.create();
    
    var childTurnLeft = Rx.Observable.of(false)
    .merge(this.handleClick.scan(false, function (val) {
      return !val;
    }));
    
    return Rx.Observable.combineLatest(
      Rx.Observable.generate(
        0,
        function () { return true; },
        function (deg) {
          return deg + 1;
        },
        function (deg) {
          return deg * -2;
        },
        Rx.Scheduler.requestAnimationFrame
      ),
      childTurnLeft, 
      function (deg, childTurnLeft) {
        return {deg: deg, childTurnLeft: childTurnLeft};
      }
    );
  },


  render: function() {
    var state = this.state || {deg: 0, childTurnLeft: false};
    
    var s = {
      border: '1px solid gray',
      borderRadius: '30px',
      display: 'inline-block',
      padding: 30,
      WebkitTransform: 'rotate(' + state.deg + 'deg)',
      transform: 'rotate(' + state.deg + 'deg)',
      marginLeft: 100,
    };
    return (
      <div style={{height: 200}}>
        <button onClick={this.handleClick}>Click</button>
        <div style={s}>
          <Child turnLeft={state.childTurnLeft}></Child>
        </div>
      </div>
    );
  }
});

module.exports = App1;
