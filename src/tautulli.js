const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const axios = require('axios');
const jtfd = require("json-to-form-data");

const mainNode = require("../index.js");
const config = require("../config/config.json");
const apiName = 'Plex-Discord Role Management API';

const onPlayBody = '{ "trigger": "playbackStarted", "user": "{user}", "username": "{username}" }';
const onStopBody = '{ "trigger": "playbackStopped", "user": "{user}", "username": "{username}" }';
const onCreatedBody = '{ "trigger": "recentlyAdded", "title": "{title}", "imdb_id": "{imdb_id}", "imdb_url": "{imdb_url}", "summary": "{summary}", "poster_url": "{poster_url}", "plex_url": "{plex_url}", <episode> "contentType": "show", "messageContent":"A new episode of {show_name} has been added to plex.\\n{show_name} (S{season_num00}E{episode_num00}) - {episode_name}", "embedTitle": "{show_name} - {episode_name} (S{season_num} · E{episode_num})"</episode> <movie> "contentType": "movie", "messageContent": "A new movie has been added to plex.\\n{title} ({year})", "embedTitle": "{title} ({year})"</movie> <show> "contentType": "show", "messageContent": "A new show has been added to plex.\\n{show_name}", "embedTitle": "{show_name}"</show> <season> "contentType": "show", "messageContent": "Season {season_num00} of {show_name} has been added to plex.\\n{show_name} Season {season_num00}", "embedTitle": "{show_name} · Season {season_num}"</season><artist>"contentType": "music"</artist><album>"contentType": "music"</album><track>"contentType": "music"</track> }';

module.exports = async(port) => {
  class tautulliService {
    constructor() {
      this.baseURL = `${config.tautulli_ip}:${config.tautulli_port}/api/v2?apikey=${config.tautulli_api_key}&cmd=`;
      if (!this.baseURL.startsWith("http://") && !this.baseURL.startsWith("https://")) {
        // we need an http or https specified so we will asumme http
        this.baseURL = "http://" + this.baseURL;
      }
    }

    async getNotifiers() {
      try {
        const response = await fetch(this.baseURL + `get_notifiers`,  {
            method: 'GET'
        });
        const json = await response.json();
        return json.response;
      } catch (error) {
        console.log(console.log(error));
      }
    }

    async addScriptNotifier(notificationUrl) {
			const before = await this.getNotifiers();

			const beforeMap = new Array(before.data.length);
			before.data.map((x) => { beforeMap[x.id] = x; });

      try {
        const response = await fetch(this.baseURL + `add_notifier_config&agent_id=25`,  {
            method: 'GET'
        });
        const json = await response.json();

        var res = json.response.data;
        const after = await this.getNotifiers();
        const afterArr = after.data;
        afterArr.forEach((item) => {
          if (!beforeMap[item.id]) this.setNotifierConfig(item.id, notificationUrl, true);
        });
      } catch (error) {
        console.log(console.log(error));
      }
    }

    async getNotifierConfig(notifierId) {
      try {
        const response = await fetch(this.baseURL + `get_notifier_config&notifier_id=${notifierId}`,  {
            method: 'GET'
        });
        const json = await response.json();
        return json.response.data;
      } catch (error) {
        console.log(console.log(error));
      }
	  }

    async setNotifierConfig(id, notificationUrl, isNew) {
			const data = {
				notifier_id: id, agent_id: 25, webhook_hook: notificationUrl, webhook_method: 'POST',
				friendly_name: apiName, on_play: 1, on_stop: 1, on_pause: 0, on_resume: 0, on_watched: 0, on_buffer: 0, on_concurrent: 0, on_newdevice: 0, on_created: 1, on_intdown: 0,
				on_intup: 0, on_extdown: 0, on_extup: 0, on_pmsupdate: 0, on_plexpyupdate: 0, parameter: '', custom_conditions: '%5B%7B%22operator%22%3A%22%22%2C%22parameter%22%3A%22%22%2C%22value%22%3A%22%22%7D%5D',
				on_play_body: onPlayBody, on_stop_body: onStopBody, on_created_body: onCreatedBody
			};

      try {
        const r = await axios({ method: 'POST', url: this.baseURL + `set_notifier_config`, data: jtfd(data) });
        /*
        const response = await fetch(this.baseURL + `set_notifier_config&notifier_id=${id}&agent_id=25`,  {
            method: 'POST',
            body: {"data": jtfd(data) }
        });
        const json = await response.json();
        console.log(json);
        */
        if (isNew) console.log('Tautulli Webhook Created!');
        else console.log('Tautulli Webhook Updated!')
      } catch (error) {
        console.log(console.log(error));
      }
	  }
  }


  var baseURL = `${config.tautulli_ip}:${config.tautulli_port}/api/v2?apikey=${config.tautulli_api_key}&cmd=`;
  if (!baseURL.startsWith("http://") && !baseURL.startsWith("https://")) {
    // we need an http or https specified so we will asumme http
    baseURL = "http://" + baseURL;
  }
  service = new tautulliService();

  try {
    const response = await fetch(baseURL + `get_notifiers`,  {
        method: 'GET'
    });
    const json = await response.json();
    if (json.response.result === "success") {
      console.log("Connected to Tautulli...");
    }
    else {
      console.log("Couldn't fetch notifiers from Tautulli, check your config.json settings")
      return;
    }
    beforeChangeNotifiers = json.response;
    const notifiersMap = new Array();
		var notificationUrl = `${config.node_hook_ip}:${config.node_hook_port}/hooks/tautulli/`;
    if (!notificationUrl.startsWith("http://") && !notificationUrl.startsWith("https://")) {
      // we need an http or https specified so we will asumme http
      notificationUrl = "http://" + notificationUrl;
    }

		if (beforeChangeNotifiers && beforeChangeNotifiers.data) {
			beforeChangeNotifiers.data.map((i) => { notifiersMap[i.friendly_name] = i; });

      if (!notifiersMap[apiName]) {
        console.log('Creating Tautulli Webhook...');
				service.addScriptNotifier(notificationUrl);
			}
      else {
				const id = notifiersMap[apiName].id;
				service.getNotifierConfig(id).then((data) => {
					if (data.config_options[0].value != notificationUrl) {
						console.log('Updating WebHook...');
						service.setNotifierConfig(id, notificationUrl, false);
					}
          else {
            console.log('Tautulli Webhook is up-to-date!');
          }
				});
			}
    }
    else {
			console.log('Creating Tautulli Webhook...');
			service.addScriptNotifier(notificationUrl);
		}
  } catch (error) {
    console.log(console.log(error));
  }

  const app = express();

  // parse application/x-www-form-urlencoded
  app.use(bodyParser.urlencoded({ extended: false }))

  // parse application/json
  app.use(bodyParser.json())

  app.post('/hooks/tautulli', async (req, res) => {
    res.status(200).send('OK');
    mainNode.processHook(req.body); // Process incoming webhooks
  });

  var server = app.listen(port, function() {
    console.log('Listening on port %d', server.address().port);
  });
}