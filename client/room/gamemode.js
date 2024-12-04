import { DisplayValueHeader, Color } from 'pixel_combats/basic';
import { Game, Players, Inventory, LeaderBoard, BuildBlocksSet, Teams, Damage, BreakGraph, Ui, Properties, GameMode, Spawns, Timers, TeamsBalancer, AreaPlayerTriggerService, AreaViewService } from 'pixel_combats/room';
import * as defaultTimer from './default_timer.js';

try {
	
    // Константы
    const WaitingPlayersTime = 3;
    const BuildBaseTime = 31;
    const GameModeTime = defaultTimer.game_mode_length_seconds();
    const DefPoints = GameModeTime * 0.2;
    const EndOfMatchTime = 10;
    const DefPointsMaxCount = 30;
    const DefTimerTickInterval = 1;
    const SavePointsCount = 10;
    const RepairPointsBySecond = 0.5;
    const CapturePoints = 10; // Сколько очков нужно для захвата
    const MaxCapturePoints = 15; // Максимальное количество очков
    const RedCaptureW = 1; // Вес красных при захвате
    const BlueCaptureW = 2; // Вес синих при захвате
    const CaptureRestoreW = 1; // Количество очков, отнимаемое, если нет красных в зоне
    const UnCapturedColor = new Color(1, 1, 1, 1); // Цвет свободной зоны
    const FakeCapturedColor = new Color(1, 1, 1, 1); // Цвет при захвате
    const CapturedColor = new Color(1, 0, 0, 0); // Цвет захваченной зоны
    const ProtectiveZoneColor = new Color(0, 0, 1, 0); // Цвет зоны защиты
    const MaxSpawnsByArea = 25; // Максимальное количество спавнов на зону

    // Константы имен
    const WaitingStateValue = "Waiting";
    const BuildModeStateValue = "BuildMode";
    const GameStateValue = "Game";
    const EndOfMatchStateValue = "EndOfMatch";
    const DefAreaTag = "def";
    const CaptureAreaTag = "capture";
    const HoldPositionHint = "GameModeHint/HoldPosition";
    const DefBlueAreaHint = "GameModeHint/DefBlueArea";
    const YourAreaIsCapturing = "GameModeHint/YourAreaIsCapturing";

    // Переменные
    const mainTimer = Timers.GetContext().Get("Main");
    const defTickTimer = Timers.GetContext().Get("DefTimer");
    const stateProp = Properties.GetContext().Get("State");
    let captureTriggers = [];
    let captureViews = [];
    let captureProperties = [];
    const capturedAreaIndexProp = Properties.GetContext().Get("RedCapturedIndex");

    function InitializeDefAreas() {
        if (!captureAreas || captureAreas.length === 0) return;

        captureTriggers = [];
        captureViews = [];
        captureProperties = [];

        // Сортировка зон
        captureAreas.sort((a, b) => a.Name.localeCompare(b.Name));

        // Инициализация переменных
        for (const area of captureAreas) {
            const view = AreaViewService.GetContext().Get(area.Name + "View");
            captureViews.push(view);
            const trigger = AreaPlayerTriggerService.Get(area.Name + "Trigger");
            captureTriggers.push(trigger);
            const prop = Properties.GetContext().Get(area.Name + "Property");
            prop.OnValue.Add(CapturePropOnValue);
            captureProperties.push(prop);
        }
    }

    function CapturePropOnValue(prop) {
        const index = captureProperties.indexOf(prop);
        if (prop.Value >= CapturePoints) {
            CaptureArea(index);
        } else {
            const d = prop.Value / MaxCapturePoints;
            if (index >= 0) {
                captureViews[index].Color = {
                    r: (FakeCapturedColor.r - UnCapturedColor.r) * d + UnCapturedColor.r,
                    g: (FakeCapturedColor.g - UnCapturedColor.g) * d + UnCapturedColor.g,
                    b: (FakeCapturedColor.b - UnCapturedColor.b) * d + UnCapturedColor.b
                };
            }
            UnCaptureArea(index);
        }
        SetSpawnIndex();
    }

    function CaptureArea(index) {
        if (index < 0 || index >= captureAreas.length) return;
        captureViews[index].Color = CapturedColor;
        if (index < captureProperties.length - 1) 
            captureViews[index + 1].Enable = true;
    }

    function UnCaptureArea(index) {
        if (index < 0 || index >= captureAreas.length) return;
        if (index < captureProperties.length - 1 && captureProperties[index + 1].Value < CapturePoints) 
            captureViews[index + 1].Enable = false;
        if (index > 0 && captureProperties[index - 1].Value < CapturePoints) 
            captureViews[index].Enable = false;
    }

    function SetSpawnIndex() {
        let maxIndex = -1;
        for (let i = 0; i < captureProperties.length; ++i) {
            if (captureProperties[i].Value >= CapturePoints)
                maxIndex = i;
        }
        capturedAreaIndexProp.Value = maxIndex;
    }

    capturedAreaIndexProp.OnValue.Add(function(prop) {
        const index = prop.Value;
        const spawns = Spawns.GetContext(redTeam);
        spawns.CustomSpawnPoints.Clear();

        if (index < 0 || index >= captureAreas.length) return;

        const area = captureAreas[index];
        const range = area.Ranges.GetEnumerator().Current;

        let lookPoint = {};
        if (index < captureAreas.length - 1) {
            lookPoint = captureAreas[index + 1].Ranges.GetAveragePosition();
        } else if (defAreas.length > 0) {
            lookPoint = defAreas[0].Ranges.GetAveragePosition();
        }

        let spawnsCount = 0;
        for (let x = range.Start.x; x < range.End.x; x += 2) {
            for (let z = range.Start.z; z < range.End.z; z += 2) {
                spawns.CustomSpawnPoints.Add(x, range.Start.y, z, Spawns.GetSpawnRotation(x, z, lookPoint.x, lookPoint.z));
                spawnsCount++;
                if (spawnsCount >= MaxSpawnsByArea) return;
            }
        }
    });

    Damage.FriendlyFire = GameMode.Parameters.GetBool("FriendlyFire");
    Map.Rotation = GameMode.Parameters.GetBool("MapRotation");
    BreakGraph.OnlyPlayerBlocksDmg = GameMode.Parameters.GetBool("PartialDestruction");
    BreakGraph.WeakBlocks = GameMode.Parameters.GetBool("LoosenBlocks");

    const defView = AreaViewService.GetContext().Get("DefView");
    defView.color = ProtectiveZoneColor;
    defView.Tags = [DefAreaTag];
    defView.Enable = true;

    const defTrigger = AreaPlayerTriggerService.Get("DefTrigger");
    defTrigger.Tags = [DefAreaTag];
    defTrigger.OnEnter.Add(function(player) {
        if (player.Team === blueTeam) {
            player.Ui.Hint.Value = DefBlueAreaHint;
        } else if (player.Team === redTeam) {
            player.Ui.Hint.Value = (stateProp.Value === GameStateValue) ? HoldPositionHint : "";
        }
    });
    defTrigger.OnExit.Add(function(player) {
        player.Ui.Hint.Reset();
    });
    defTrigger.Enable = true;

    defTickTimer.OnTimer.Add(function() {
        DefTriggerUpdate();
        CaptureTriggersUpdate();
    });

    function DefTriggerUpdate() {
        if (stateProp.Value !== GameStateValue) return;

        const players = defTrigger.GetPlayers();
        const blueCount = players.filter(p => p.Team === blueTeam).length;
        const redCount = players.filter(p => p.Team === redTeam).length;

        if (redCount === 0) {
            if (blueTeam.Properties.Get("Deaths").Value % SavePointsCount !== 0) {
                blueTeam.Properties.Get("Deaths").Value += RepairPointsBySecond;
            }
            blueTeam.Ui.Hint.Value = DefBlueAreaHint;
            return;
        }
        blueTeam.Properties.Get("Deaths").Value -= redCount;
        blueTeam.Ui.Hint.Value = YourAreaIsCapturing;
    }

    function CaptureTriggersUpdate() {
        if (stateProp.Value !== GameStateValue) return;

        for (let i = 0; i < captureTriggers.length; ++i) {
            const trigger = captureTriggers[i];
            const players = trigger.GetPlayers();
            const blueCount = players.filter(p => p.Team === blueTeam).length;
            const redCount = players.filter(p => p.Team === redTeam).length;

            const value = captureProperties[i].Value;
            let changePoints = -blueCount * BlueCaptureW;

            if (i === 0 || captureProperties[i - 1].Value >= CapturePoints) {
                changePoints += redCount * RedCaptureW;
            }
            if (redCount === 0 && value < CapturePoints) changePoints -= CaptureRestoreW;

            if (changePoints !== 0) {
                let newValue = value + changePoints;
                newValue = Math.max(0, Math.min(newValue, MaxCapturePoints));
                captureProperties[i].Value = newValue;
            }
        }
    }

    BreakGraph.PlayerBlockBoost = true;

    Properties.GetContext().GameModeName.Value = "GameModes/Team Dead Match";
    TeamsBalancer.IsAutoBalance = true;
    Ui.GetContext().MainTimerId.Value = mainTimer.Id;

    Teams.Add("Blue", "Teams/Blue", new Color(0, 0, 1, 0));
    Teams.Add("Red", "Teams/Red", new Color(1, 0, 0, 0));
    const BlueTeam = Teams.Get("Blue");
    const RedTeam = Teams.Get("Red");
    BlueTeam.Spawns.SpawnPointsGroups.Add(1);
    RedTeam.Spawns.SpawnPointsGroups.Add(2);
    BlueTeam.Build.BlocksSet.Value = BuildBlocksSet.Blue;
    RedTeam.Build.BlocksSet.Value = BuildBlocksSet.Red;

    Spawns.GetContext().RespawnTime.Value = 5;

    BlueTeam.Properties.Get("Deaths").Value = DefPoints;
    RedTeam.Properties.Get("Deaths").Value = DefPoints;

    LeaderBoard.PlayerLeaderBoardValues = [
        { Value: "Kills", DisplayName: "У", ShortDisplayName: "У" },
        { Value: "Deaths", DisplayName: "С", ShortDisplayName: "С" },
        { Value: "Spawns", DisplayName: "С", ShortDisplayName: "С" },
        { Value: "Scores", DisplayName: "О", ShortDisplayName: "О" }
    ];
    LeaderBoard.TeamLeaderBoardValue = {
        Value: "Deaths",
        DisplayName: "С",
        ShortDisplayName: "С"
    };

    LeaderBoard.PlayersWeightGetter.Set(function(player) {
        return player.Properties.Get("Kills").Value;
    });

    Ui.GetContext().TeamProp1.Value = { Team: "Blue", Prop: "Deaths" };

    Teams.OnRequestJoinTeam.Add(function(player, team) {
        team.Add(player);
    });

    Teams.OnPlayerChangeTeam.Add(function(player) {
        player.Spawns.Spawn();
    });

    const immortalityTimerName = "immortality";
    Spawns.GetContext().OnSpawn.Add(function(player) {
        player.Properties.Immortality.Value = true;
        player.Timers.Get(immortalityTimerName).Restart(7);
    });

    Timers.OnPlayerTimer.Add(function(timer) {
        if (timer.Id !== immortalityTimerName) return;
        timer.Player.Properties.Immortality.Value = false;
    });

    Properties.OnTeamProperty.Add(function(context, value) {
        if (context.Team !== blueTeam) return;
        if (value.Name !== "Deaths") return;
        if (value.Value <= 0) RedWin();
    });

    Spawns.OnSpawn.Add(function(player) {
        player.Properties.Spawns.Value++;
    });

    Damage.OnDeath.Add(function(player) {
        player.Properties.Deaths.Value++;
    });

    Damage.OnKill.Add(function(player, killed) {
        if (killed.Team && killed.Team !== player.Team) {
            player.Properties.Kills.Value++;
            player.Properties.Scores.Value += 100;
        }
    });

    mainTimer.OnTimer.Add(function() {
        switch (stateProp.Value) {
            case WaitingStateValue:
                SetBuildMode();
                break;
            case BuildModeStateValue:
                SetGameMode();
                break;
            case GameStateValue:
                BlueWin();
                break;
            case EndOfMatchStateValue:
                RestartGame();
                break;
        }
    });

    SetWaitingMode();

    function SetWaitingMode() {
        Ui.GetContext().Hint.Value = "ОЖИДАНИЕ, ИГРОКОВ...";
        Spawns.GetContext().Enable = true;
        mainTimer.Restart(WaitingPlayersTime);
    }

    function SetBuildMode() {
        for (let i = 0; i < captureAreas.length; ++i) {
            const view = captureViews[i];
            view.Area = captureAreas[i];
            view.Color = UnCapturedColor;
            view.Enable = i === 0;

            const trigger = captureTriggers[i];
            trigger.Area = captureAreas[i];
            trigger.Enable = true;

            const prop = captureProperties[i];
            prop.Value = 0;
        }

        stateProp.Value = BuildModeStateValue;
        Ui.GetContext().Hint.Value = "ChangeTeamHint";
        BlueTeam.Ui.Hint.Value = "PrepareToDefBlueArea";
        RedTeam.Ui.Hint.Value = "WaitingForBlueBuildHint";

        BlueTeam.Inventory.Main.Value = false;
        BlueTeam.Inventory.Secondary.Value = false;
        BlueTeam.Inventory.Melee.Value = true;
        BlueTeam.Inventory.Explosive.Value = false;
        BlueTeam.Inventory.Build.Value = true;
        BlueTeam.Inventory.BuildInfinity.Value = true;

        RedTeam.Inventory.Main.Value = false;
        RedTeam.Inventory.Secondary.Value = false;
        RedTeam.Inventory.Melee.Value = false;
        RedTeam.Inventory.Explosive.Value = false;
        RedTeam.Inventory.Build.Value = false;

        mainTimer.Restart(BuildBaseTime);
        Spawns.GetContext().Enable = true;
        SpawnTeams();
    }

    function SetGameMode() {
        stateProp.Value = GameStateValue;
        BlueTeam.Ui.Hint.Value = "!Защищайте, синию зону!";
        RedTeam.Ui.Hint.Value = "!Захватите, синию зону!";

        BlueTeam.Inventory.Main.Value = true;
        BlueTeam.Inventory.MainInfinity.Value = true;
        BlueTeam.Inventory.Secondary.Value = true;
        BlueTeam.Inventory.SecondaryInfinity.Value = true;
        BlueTeam.Inventory.Melee.Value = true;
        BlueTeam.Inventory.Explosive.Value = true;
        BlueTeam.Inventory.Build.Value = true;
        BlueTeam.Inventory.BuildInfinity.Value = true;


        RedTeam.Inventory.Main.Value = true;
        RedTeam.Inventory.Secondary.Value = true;
        RedTeam.Inventory.Melee.Value = true;
        RedTeam.Inventory.Explosive.Value = true;
        RedTeam.Inventory.Build.Value = true;
	RedTeam.Inventory.BuildInfinity.Value = true;

        mainTimer.Restart(GameModeTime);
        defTickTimer.RestartLoop(DefTimerTickInterval);
        Spawns.GetContext().Spawn();
        SpawnTeams();
    }

    function BlueWin() {
        stateProp.Value = EndOfMatchStateValue;
        Ui.GetContext().Hint.Value = "!Захват, зоны!";
        Game.GameOver(BlueTeam);
        mainTimer.Restart(EndOfMatchTime);
    }

    function RedWin() {
        stateProp.Value = EndOfMatchStateValue;
        Ui.GetContext().Hint.Value = "!Конец, матча!";
        Spawns.GetContext().Enable = false;
        Spawns.GetContext().Despawn();
        Game.GameOver(RedTeam);
        mainTimer.Restart(EndOfMatchTime);
    }

    function RestartGame() {
        Game.RestartGame();
    }

    function SpawnTeams() {
        const Spawns = Teams.Spawn();
        Spawns.GetContext().Spawn();
    }

} catch (e) {
    Players.All.forEach(p => {
        p.PopUp(`${e.name}: ${e.message} ${e.stack}`);
    });
}
