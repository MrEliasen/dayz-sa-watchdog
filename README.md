# Dayz Standalone - Watchdog

A fairly simple desktop application which reads DayZ SA ADM log files. It will watch for changes to the files and push new events to a discord server/channel of your choice.

### Build from source

NodeJS version 10.x or newer. Older versions should work as well, but I have only tested v10.x.

- Clone or download the repository.
- run `npm install` to install the dependencies.
- run `npm run dist:win` to compile the application for windows ( `dist:mac` for MacOS and  `dist` to compile for both).

Before you ask, I coded on MacOS, hence why I compile for it as well even though the server and files are windows :).

### Parsed Events

The events the app can currently understand the following events:

- Player connected
- Player disconnected
- Chat messages
- Damage to player from NPC
- Damage to player from Player
- Damage to player from fall damage/environment
- Player killed by NPC
- Player killed by player
- Player suicide
- Player bled out
- Player conscious changes
- Player killed (generic/unknown)

### License

Released under the [GPL-3.0](https://github.com/MrEliasen/dayz-sa-watchdog/blob/master/LICENSE) license.
