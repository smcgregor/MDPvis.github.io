"""
Cross-origin MDPVis Server
===================
This is a minimal server for integrating MDPVis with a domain.
The domain_bridge.py is expected to be defined in the parent
directory.

:copyright: (C) 2015 by Sean McGregor.
:license:   MIT, see LICENSE for more details.
"""
from flask import Flask, jsonify, request, redirect
import sys

# Add the parent folder path to the sys.path list so
# we can include its bridge
sys.path.insert(0, '..')
import domain_bridge

try:
    # The typical way to import flask-cors
    from flask.ext.cors import cross_origin
except ImportError:
    # Path hack allows examples to be run without installation.
    import os
    parentdir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    os.sys.path.insert(0, parentdir)

    from flask.ext.cors import cross_origin

# Static Resources directory assumes the visualization is served from
# a directory called 'FireVis'. todo: rename repository to MDPVis
app = Flask('MDPVis', static_folder='.', static_url_path='')

@app.route("/MDPvis/", methods=['GET'])
@cross_origin()
def MDPvis():
    return redirect("/index2.html", code=302)

@app.route("/dashboard/pages/", methods=['GET'])
@cross_origin()
def MDPvisDashboard():
    return redirect("/dashboard/pages/index.html", code=302)

@app.route("/", methods=['GET'])
@cross_origin()
def site_root():
    '''
        This view has CORS enabled for all domains, representing the simplest
        configuration of view-based decoration. You can test this endpoint
        with:

        $ curl --include -X GET http://127.0.0.1:5000/ \
            --header Origin:www.examplesite.com

        Which should return something like:

        >> HTTP/1.0 200 OK
        Content-Type: text/html; charset=utf-8
        Content-Length: 186
        Access-Control-Allow-Origin: www.examplesite.com
        Server: Werkzeug/0.10.4 Python/2.7.9
        Date: Tue, 19 May 2015 17:13:39 GMT

        THE DOCUMENT FOUND BELOW
    '''
    return '''
        <h1>Hello MDPVis!</h1>
        <p style='font-size: 150%;'>Your server is running and ready for
        integration with your MDP domain and optimizer.</p>
        <p  style='font-size: 150%;'>To test the other endpoints, visit
          <a href="/initialize">/initialize</a>,
          <a href="/rollouts">/rollouts</a>,
          <a href="/optimize">/optimize</a>, or
          <a href="/state">/state</a>
        '''

@app.route("/initialize", methods=['GET'])
@cross_origin(allow_headers=['Content-Type'])
def cross_origin_initialize():
    '''
        Asks the domain for the parameters to seed the visualization.
    '''
    return jsonify(domain_bridge.initialize())

@app.route("/rollouts", methods=['GET'])
@cross_origin(allow_headers=['Content-Type'])
def cross_origin_rollouts():
    '''
        Asks the domain for the rollouts generated by the
        requested parameters.
    '''
    q = parse_query(request.args)
    rollouts = domain_bridge.rollouts(q)
    return jsonify({"rollouts": rollouts})

@app.route("/optimize", methods=['GET'])
@cross_origin(allow_headers=['Content-Type'])
def cross_origin_optimize():
    '''
        Asks the domain to optimize for the current parameters, then return the
        new set of parameters for the optimized policy.
    '''
    q = parse_query(request.args)
    return jsonify(domain_bridge.optimize(q))

@app.route("/state", methods=['GET'])
@cross_origin(allow_headers=['Content-Type'])
def cross_origin_state():
    '''
        Ask the domain for the referenced state and state snapshots.
    '''
    q = parse_query(request.args)
    return jsonify(domain_bridge.state(q))

def parse_query(queryObject):
    """
    Get all the reward, transition, policy, and events into their dictionaries.
    """
    queryDict = {"reward":{}, "transition":{}, "policy":{}, "Event Number": -1, "Pathway Number": -1}
    for key in queryObject:
        cur = key.replace("]","[").split("[") # Quick and dirty hack
        if len(cur) > 1:
            queryDict[cur[0]][cur[1]] = float(queryObject[key])
        else:
            queryDict[cur[0]] = float(queryObject[key][0])
    return queryDict

# Binds the server to port 8938 and listens to all IP addresses.
if __name__ == "__main__":
    app.run(host='0.0.0.0', port=8938, debug=True)
