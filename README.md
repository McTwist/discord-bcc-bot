## BCC Discord Bot

Based on work by @TheBlackParrot and @Pecon. Not forked, as previous repository was private. The bot was specifically created for BCC Discord server. It contains some of the tools that are necessary for moderation of the members, and some features connected to the games we play.

### Usage

With Docker it is fairly straightforward. The only change is to make sure the config is properly set. Check the example files. More files may be added in there and updated while running for the various persistent services.

```bash
docker compose up --build -d
```

For direct hosting, make sure [bun](https://bun.sh/) is installed and then install all dependencies.

```bash
bun ci
```

Finally create a service that runs the following.

```bash
bun start
``` 
