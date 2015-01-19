/*global -React */
var React = require('react');
var stateStream = require('./stateStream');
var easingTypes = require('./easingTypes');

var RxReact = require('rx-react/browser');
var Rx = require('rx');
var update = require('react/lib/update');
var assign = require('object-assign');
require('./rx-dom');


function toObj(children) {
  return React.Children.map(children, function(child) {
    return child;
  });
}

function diff(o1, o2) {
  var res = [];
  for (var key in o1) {
    if (!o1.hasOwnProperty(key)) {
      continue;
    }
    if (!o2.hasOwnProperty(key)) {
      res.push(key);
    }
  }

  return res;
}

var Container = React.createClass({
  mixins: [RxReact.LifecycleMixin, RxReact.StateStreamMixin],
  getStateStream: function() {
    
    var children = toObj(this.props.children);
    var configs = {};
    for (var key in children) {
      if (!children.hasOwnProperty(key)) {
        continue;
      }
      configs[key] = {
        left: 0,
        height: 60,
        opacity: 1
      };
    }
    
    var self = this;
    
    return Rx.Observable
    .of({
      children: children,
      configs: configs,
    })
    .merge(
      this.lifecycle.componentWillUpdate
      .map(function (descr) {
        var children = toObj(descr.nextProps.children);
        var oldChildren = toObj(self.props.children);

        return {
          enters: diff(children, oldChildren),
          exits: diff(oldChildren, children),
          children: children 
        };
      })
      .filter(function (descr) {
        return descr.exits.length !== 0 || descr.enters.length !== 0;
      })
      .flatMap(function (descr) {
        var exits = descr.exits;
        var enters = descr.enters;
        var children = descr.children;
        
        var duration = 700;
        var frameCount = stateStream.toFrameCount(duration);
        var initState = self.state;

        if (exits.length > 0) {
          
          return Rx.Observable.range(0, frameCount, Rx.Scheduler.requestAnimationFrame)
          .map(function (i) {
            var spec = { configs : {} };
            exits.forEach(function (exitKey) {
              var ms = stateStream.toMs(i);
              var config = initState.configs[exitKey];
              spec.configs[exitKey] = {
                $set: {
                  left: easingTypes.easeInOutQuad(ms, config.left, -200, duration),
                  opacity: easingTypes.easeInOutQuad(ms, config.opacity, 0, duration),
                  height: easingTypes.easeInOutQuad(ms, config.height, 0, duration)
                }
              };
            });
            return spec;
          })
          .concat(Rx.Observable.of({
            children: {
              $set: children
            },
            configs: {
              $set: exits.reduce(function (configs, exitKey) {
                delete configs[exitKey];
                return configs;
              }, assign({}, initState.configs))
            }
          }));
        }
        

        if (enters.length > 0) {
          
          return Rx.Observable.range(0, frameCount, Rx.Scheduler.requestAnimationFrame)
          .map(function (i) {
            var spec = { 
              configs : {},  
              children: {
                $set: children
              }
            };
            enters.forEach(function(exitKey) {
              var ms = stateStream.toMs(i);
              var config = initState.configs[exitKey];
              spec.configs[exitKey] = {
                $set: {
                  left: easingTypes.easeInOutQuad(ms, config.left, 0, duration),
                  opacity: easingTypes.easeInOutQuad(ms, config.opacity, 1, duration),
                  height: easingTypes.easeInOutQuad(ms, config.height, 60, duration)
                }
              };
            });
            return spec;
          })
          .concat(Rx.Observable.of({
            configs: {
              $set: enters.reduce(function (configs, enterKey) {
                configs[enterKey] = {
                    left: 0,
                    height: 60,
                    opacity: 1
                };
                return configs;
              }, assign({}, initState.configs))
            }
          }));
        }
      })
      .map(function (spec) {
        return update(self.state, spec);
      })
    );
  },


  render: function() {
    var state = this.state;
    var children = [];
    for (var key in state.children) {
      if (!state.children.hasOwnProperty(key)) {
        continue;
      }
      var s = {
        left: state.configs[key].left,
        height: state.configs[key].height,
        opacity: state.configs[key].opacity,
        position: 'relative',
        overflow: 'hidden',
        WebkitUserSelect: 'none',
      };
      children.push(
        <div style={s} key={key}>{state.children[key]}</div>
      );
    }


    return (
      <div>
        {children}
      </div>
    );
  }
});

// notice that this component is ignorant of both immutable-js and the animation
var App3 = React.createClass({
  getInitialState: function() {
    return {
      items: ['a', 'b', 'c', 'd'],
    };
  },

  handleClick: function(item) {
    var items = this.state.items;
    var idx = items.indexOf(item);
    if (idx === -1) {
      // might not find the clicked item because it's transitioning out and
      // doesn't technically exist here in the parent anymore. Make it
      // transition back (BEAT THAT)
      items.push(item);
      items.sort();
    } else {
      items.splice(idx, 1);
    }
    this.setState({
      items: items,
    });
  },

  render: function() {
    var s = {
      width: 100,
      padding: 20,
      border: '1px solid gray',
      borderRadius: 3,
    };

    return (
      <div>
        Click to remove. Double click to un-remove (!)
        <Container>
          {this.state.items.map(function(item) {
            return (
              <div
                style={s}
                key={item}
                onClick={this.handleClick.bind(null, item)}>
                {item}
              </div>
            );
          }, this)}
        </Container>
      </div>
    );
  }
});

module.exports = App3;
