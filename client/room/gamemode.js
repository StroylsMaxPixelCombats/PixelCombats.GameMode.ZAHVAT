import { DisplayValueHeader, Color } from 'pixel_combats/basic';
import { Game, Players, Inventory, LeaderBoard, BuildBlocksSet, Teams, Damage, BreakGraph, Ui, Properties, GameMode, Spawns, Timers, TeamsBalancer, AreaPlayerTriggerService, AreaViewService } from 'pixel_combats/room';
import * as defaultTimer from './default_timer.js';

try {
	
    // настройки
    const WaitingPlayersTime = 10;
    const BuildBaseTime = 60;
    const GameModeTime = 300;
    const DefPoints = GameModeTime * 0.2;
    const EndOfMatchTime = 10;
    const DefPointsMaxCount = 30;
    const DefTimerTickInterval = 1;
    const SavePointsCount = 10;
    const RepairPointsBySecond = 0.5;
    const CapturePoints = 10; // сколько очков нужно для захвата
    const MaxCapturePoints = 15; // сколько макс очков
    const RedCaptureW = 1; // вес красных при захвате спавна
    const BlueCaptureW = 2; // вес синих при захвате спавна
    const CaptureRestoreW = 1; // сколько очков отнимается, если нет красных в зоне для захвата
    const UnCapturedColor = { r: 1, g: 1, b: 1 };
    const FakeCapturedColor = { r: 0, g: 1, b: 0 }; // к какому цвету стремится зона при ее захвате
    const CapturedColor = { r: 1 };
    const MaxSpawnsByArea = 25; // макс спавнов на зону

    // константы
    const WaitingStateValue = "Waiting";
    const BuildModeStateValue = "BuildMode";
    const GameStateValue = "Game";
    const EndOfMatchStateValue = "EndOfMatch";
    const DefAreaTag = "def";
    const CaptureAreaTag = "capture";
    const HoldPositionHint = "GameModeHint/HoldPosition";
    const RunToBliePointHint = "GameModeHint/RunToBliePoint";
    const DefBlueAreaHint = "GameModeHint/DefBlueArea";
    const DefThisAreaHint = "GameModeHint/DefThisArea";
    const WaitingForBlueBuildHint = "GameModeHint/WaitingForBlueBuild";
    const ChangeTeamHint = "GameModeHint/ChangeTeam";
    const YourAreaIsCapturing = "GameModeHint/YourAreaIsCapturing";
    const PrepareToDefBlueArea = "GameModeHint/PrepareToDefBlueArea";

    // постоянные переменные
    const mainTimer = Timers.GetContext().Get("Main");
    const defTickTimer = Timers.GetContext().Get("DefTimer");
    const stateProp = Properties.GetContext().Get("State");
    let defAreas = AreaService.GetByTag(DefAreaTag);
    let captureAreas = AreaService.GetByTag(CaptureAreaTag);
    let captureTriggers = [];
    let captureViews = [];
    let captureProperties = [];
    const capturedAreaIndexProp = Properties.GetContext().Get("RedCapturedIndex");

    // задаем цвет всем зонам для захвата
    Map.OnLoad.Add(function() {
        InitializeDefAreas();
    });

    function InitializeDefAreas() {
        defAreas = AreaService.GetByTag(DefAreaTag);
        captureAreas = AreaService.GetByTag(CaptureAreaTag);
        // ограничитель
        if (!captureAreas || captureAreas.length === 0) return;

        captureTriggers = [];
        captureViews = [];
        captureProperties = [];

        // сортировка зон
        captureAreas.sort((a, b) => a.Name.localeCompare(b.Name));

        // инициализация переменных
        for (let i = 0; i < captureAreas.length; ++i) {
            // создаем визуализатор
            const view = AreaViewService.GetContext().Get(captureAreas[i].Name + "View");
            captureViews.push(view);
            // создаем триггер
            const trigger = AreaPlayerTriggerService.Get(captureAreas[i].Name + "Trigger");
            captureTriggers.push(trigger);
            // создаем свойство для захвата
            const prop = Properties.GetContext().Get(captureAreas[i].Name + "Property");
            prop.OnValue.Add(CapturePropOnValue);
            captureProperties.push(prop);
        }
    }
    InitializeDefAreas();

    function CapturePropOnValue(prop) {
        // берем индекс зоны
        let index = captureProperties.indexOf(prop);
        // отмачаем зону захваченой/незахваченой
        if (prop.Value >= CapturePoints) {
            CaptureArea(index);
        } else {
            // красим в фейковую закраску
            const d = prop.Value / MaxCapturePoints;
            if (index >= 0) {
                captureViews[index].Color = {
                    r: (FakeCapturedColor.r - UnCapturedColor.r) * d + UnCapturedColor.r,
                    g: (FakeCapturedColor.g - UnCapturedColor.g) * d + UnCapturedColor.g,
                    b: (FakeCapturedColor.b - UnCapturedColor.b) * d + UnCapturedColor.b
                };
            }
            // снятие захвата
            UnCaptureArea(index);
        }
        // задаем индекс захваченой зоны красными
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
        // поиск макс захваченой области
        let maxIndex = -1;
        for (let i = 0; i < captureProperties.length; ++i) {
            if (captureProperties[i].Value >= CapturePoints) {
                maxIndex = i;
            }
        }
        capturedAreaIndexProp.Value = maxIndex;
    }

    capturedAreaIndexProp.OnValue.Add(function(prop) {
        const index = prop.Value;
        const spawns = Spawns.GetContext(redTeam);
        // очистка спавнов
        spawns.CustomSpawnPoints.Clear();
        // если нет захвата то сброс спавнов
        if (index < 0 || index >= captureAreas.length) return;
        // задаем спавны
        const area = captureAreas[index];
        const iter = area.Ranges.GetEnumerator();
        iter.MoveNext();
        const range = iter.Current;

        // определяем куда смотреть спавнам
        let lookPoint = {};
        if (index < captureAreas.length - 1) {
            lookPoint = captureAreas[index + 1].Ranges.GetAveragePosition();
        } else {
            if (defAreas.length > 0) 
                lookPoint = defAreas[0].Ranges.GetAveragePosition();
        }

        let spawnsCount = 0;
        for (let x = range.Start.x; x < range.End.x; x += 2) {
            for (let z = range.Start.z; z < range.End.z; z += 2) {
                spawns.CustomSpawnPoints.Add(x, range.Start.y, z, Spawns.GetSpawnRotation(x, z, lookPoint.x, lookPoint.z));
                ++spawnsCount;
                if (spawnsCount > MaxSpawnsByArea) return;
            }
        }
    });

    // проверка валидности
    //if (defAreas.length == 0) Validate.ReportInvalid("GameMode/Validation/NeedDefTaggedArea");
    //else Validate.ReportValid();

    // применяем параметры создания комнаты
    Damage.FriendlyFire = GameMode.Parameters.GetBool("FriendlyFire");
    Map.Rotation = GameMode.Parameters.GetBool("MapRotation");
    BreakGraph.OnlyPlayerBlocksDmg = GameMode.Parameters.GetBool("PartialDesruction");
    BreakGraph.WeakBlocks = GameMode.Parameters.GetBool("LoosenBlocks");

    // создаем визуализацию зон защиты
    const defView = AreaViewService.GetContext().Get("DefView");
    defView.color = { b: 1 };
    defView.Tags = [DefAreaTag];
    defView.Enable = true;

    // создаем триггер зон защиты
    const defTrigger = AreaPlayerTriggerService.Get("DefTrigger");
    defTrigger.Tags = [DefAreaTag];
    defTrigger.OnEnter.Add(function(player) {
        if (player.Team == blueTeam) {
            player.Ui.Hint.Value = DefThisAreaHint;
            return;
        }
        if (player.Team == redTeam) {
            if (stateProp.Value == GameStateValue)
                player.Ui.Hint.Value = HoldPositionHint;
            else
                player.Ui.Hint.Reset();
            return;
        }
    });

    defTrigger.OnExit.Add(function(player) {
        player.Ui.Hint.Reset();
    });
    defTrigger.Enable = true;

    // задаем обработчик таймера триггера
    defTickTimer.OnTimer.Add(function(timer) {
        DefTriggerUpdate();
        CaptureTriggersUpdate();
    });

    function DefTriggerUpdate() {
        // ограничитель игрового режима
        if (stateProp.Value != GameStateValue) return;
        // поиск количества синих и красных в триггере
        let blueCount = 0;
        let redCount = 0;
        const players = defTrigger.GetPlayers();
        for (let i = 0; i < players.length; ++i) {
            const p = players[i];
            if (p.Team == blueTeam) ++blueCount;
            if (p.Team == redTeam) ++redCount;
        }

        // если красных нет в зоне то восстанавливаются очки
        if (redCount == 0) {
            // восстанавливаем очки до несгораемой суммы
            if (blueTeam.Properties.Get("Deaths").Value % SavePointsCount != 0)
                blueTeam.Properties.Get("Deaths").Value += RepairPointsBySecond;
            // синим идет подсказка об обороне зоны
            if (stateProp.Value == GameStateValue)
                blueTeam.Ui.Hint.Value = DefBlueAreaHint;
            return;
        }

        // если есть хоть один красный то очки отнимаются
        blueTeam.Properties.Get("Deaths").Value -= redCount;
        // синим идет подсказка что зону захватывают
        if (stateProp.Value == GameStateValue)
            blueTeam.Ui.Hint.Value = YourAreaIsCapturing;
    }

    // обновление зон захвата
    function CaptureTriggersUpdate() {
        // ограничитель игрового режима
        if (stateProp.Value != GameStateValue) return;
        // ограничитель
        if (!captureTriggers || captureTriggers.length === 0) return;

        // обновление
        for (let i = 0; i < captureTriggers.length; ++i) {
            // берем триггер
            const trigger = captureTriggers[i];
            // поиск количества синих и красных в триггере
            let blueCount = 0;
            let redCount = 0;
            const players = trigger.GetPlayers();
            for (let j = 0; j < players.length; ++j) {
                const p = players[j];
                if (p.Team == blueTeam) ++blueCount;
                if (p.Team == redTeam) ++redCount;
            }
            // берем свойство захвата
            const index = captureTriggers.indexOf(trigger);
            if (index < 0) continue;
            let value = captureProperties[index].Value;
            // определяем на сколько очков изменять зону
            // очки за присутствие синих
            let changePoints = -blueCount * BlueCaptureW;
            // очки за присутствие красных
            if (index == 0 || captureProperties[index - 1].Value >= CapturePoints) {
                changePoints += redCount * RedCaptureW;
            }
            // спад очков захвата, если нет красных
            if (redCount == 0 && value < CapturePoints) changePoints -= CaptureRestoreW;
            // ограничители
            if (changePoints == 0) continue;
            let newValue = value + changePoints;
            if (newValue > MaxCapturePoints) newValue = MaxCapturePoints;
            if (newValue < 0) newValue = 0;
            // изменяем очки захвата зоны
            captureProperties[index].Value = newValue;
        }
    }

    // блок игрока всегда усилен
    BreakGraph.PlayerBlockBoost = true;

    // параметры игры
    Properties.GetContext().GameModeName.Value = "GameModes/Team Dead Match";
    TeamsBalancer.IsAutoBalance = true;
    Ui.GetContext().MainTimerId.Value = mainTimer.Id;
    // создаем команд
    Teams.Add("Blue", "Teams/Blue", { b: 1 });
    Teams.Add("Red", "Teams/Red", { r: 1 });
    const blueTeam = Teams.Get("Blue");
    const redTeam = Teams.Get("Red");
    blueTeam.Spawns.SpawnPointsGroups.Add(1);
    redTeam.Spawns.SpawnPointsGroups.Add(2);
    blueTeam.Build.BlocksSet.Value = BuildBlocksSet.Blue;
    redTeam.Build.BlocksSet.Value = BuildBlocksSet.Red;

    // делаем моментальный спавн синим
    blueTeam.Spawns.RespawnTime.Value = 10;
    redTeam.Spawns.RespawnTime.Value = 0;

    // задаем макс очки синей команды
    blueTeam.Properties.Get("Deaths").Value = DefPoints;

    // задаем что выводить в лидербордах
    LeaderBoard.PlayerLeaderBoardValues = [
        {
            Value: "Kills",
            DisplayName: "Statistics/Kills",
            ShortDisplayName: "Statistics/KillsShort"
        },
        {
            Value: "Deaths",
            DisplayName: "Statistics/Deaths",
            ShortDisplayName: "Statistics/DeathsShort"
        },
        {
            Value: "Spawns",
            DisplayName: "Statistics/Spawns",
            ShortDisplayName: "Statistics/SpawnsShort"
        },
        {
            Value: "Scores",
            DisplayName: "Statistics/Scores",
            ShortDisplayName: "Statistics/ScoresShort"
        }
    ];
    LeaderBoard.TeamLeaderBoardValue = {
        Value: "Deaths",
        DisplayName: "Statistics/Deaths",
        ShortDisplayName: "Statistics/Deaths"
    };
    // вес игрока в лидерборде
    LeaderBoard.PlayersWeightGetter.Set(function(player) {
        return player.Properties.Get("Kills").Value;
    });

    // задаем что выводить вверху
    Ui.GetContext().TeamProp1.Value = { Team: "Blue", Prop: "Deaths" };

    // разрешаем вход в команды по запросу
    Teams.OnRequestJoinTeam.Add(function(player, team) {
        team.Add(player);
    });
    // спавн по входу в команду
    Teams.OnPlayerChangeTeam.Add(function(player) {
        player.Spawns.Spawn();
    });

    // делаем игроков неуязвимыми после спавна
    const immortalityTimerName = "immortality";
    Spawns.GetContext().OnSpawn.Add(function(player) {
        player.Properties.Immortality.Value = true;
        const timer = player.Timers.Get(immortalityTimerName).Restart(5);
    });
    Timers.OnPlayerTimer.Add(function(timer) {
        if (timer.Id != immortalityTimerName) return;
        timer.Player.Properties.Immortality.Value = false;
    });

    // если в команде количество смертей занулилось то завершаем игру
    Properties.OnTeamProperty.Add(function(context, value) {
        if (context.Team != blueTeam) return;
        if (value.Name !== "Deaths") return;
        if (value.Value <= 0) RedWin();
    });

    // счетчик спавнов
    Spawns.OnSpawn.Add(function(player) {
        ++player.Properties.Spawns.Value;
    });
    // счетчик смертей
    Damage.OnDeath.Add(function(player) {
        ++player.Properties.Deaths.Value;
    });
    // счетчик убийств
    Damage.OnKill.Add(function(player, killed) {
        if (killed.Team != null && killed.Team != player.Team) {
            ++player.Properties.Kills.Value;
            player.Properties.Scores.Value += 100;
        }
    });

    // настройка переключения режимов
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

    // задаем первое игровое состояние
    SetWaitingMode();

    // состояния игры
    function SetWaitingMode() {
        stateProp.Value = WaitingStateValue;
        Ui.GetContext().Hint.Value = "Hint/WaitingPlayers";
        Spawns.GetContext().enable = false;
        mainTimer.Restart(WaitingPlayersTime);
    }

    function SetBuildMode() {
        // инициализация режима
        for (let i = 0; i < captureAreas.length; ++i) {
            // визуализатор
            const view = captureViews[i];
            view.Area = captureAreas[i];
            view.Color = UnCapturedColor;
            view.Enable = i === 0;
            // триггер
            const trigger = captureTriggers[i];
            trigger.Area = captureAreas[i];
            trigger.Enable = true;
            // свойство для захвата
            const prop = captureProperties[i];
            prop.Value = 0;
        }

        stateProp.Value = BuildModeStateValue;
        Ui.GetContext().Hint.Value = ChangeTeamHint;
        blueTeam.Ui.Hint.Value = PrepareToDefBlueArea;
        redTeam.Ui.Hint.Value = WaitingForBlueBuildHint;

        blueTeam.Inventory.Main.Value = false;
        blueTeam.Inventory.Secondary.Value = false;
        blueTeam.Inventory.Melee.Value = true;
        blueTeam.Inventory.Explosive.Value = false;
        blueTeam.Inventory.Build.Value = true;
        blueTeam.Inventory.BuildInfinity.Value = true;

        redTeam.Inventory.Main.Value = false;
        redTeam.Inventory.Secondary.Value = false;
        redTeam.Inventory.Melee.Value = false;
        redTeam.Inventory.Explosive.Value = false;
        redTeam.Inventory.Build.Value = false;

        mainTimer.Restart(BuildBaseTime);
        Spawns.GetContext().enable = true;
        SpawnTeams();
    }

    function SetGameMode() {
        stateProp.Value = GameStateValue;
        blueTeam.Ui.Hint.Value = DefBlueAreaHint;
        redTeam.Ui.Hint.Value = RunToBliePointHint;

        blueTeam.Inventory.Main.Value = true;
        blueTeam.Inventory.MainInfinity.Value = true;
        blueTeam.Inventory.Secondary.Value = true;
        blueTeam.Inventory.SecondaryInfinity.Value = true;
        blueTeam.Inventory.Melee.Value = true;
        blueTeam.Inventory.Explosive.Value = true;
        blueTeam.Inventory.Build.Value = true;

        redTeam.Inventory.Main.Value = true;
        redTeam.Inventory.Secondary.Value = true;
        redTeam.Inventory.Melee.Value = true;
        redTeam.Inventory.Explosive.Value = true;
        redTeam.Inventory.Build.Value = true;

        mainTimer.Restart(GameModeTime);
        defTickTimer.RestartLoop(DefTimerTickInterval);
        Spawns.GetContext().Despawn();
        SpawnTeams();
    }

    function BlueWin() {
        stateProp.Value = EndOfMatchStateValue;
        Ui.GetContext().Hint.Value = "Hint/EndOfMatch";

        const spawns = Spawns.GetContext();
        spawns.enable = false;
        spawns.Despawn();
        Game.GameOver(blueTeam);
        mainTimer.Restart(EndOfMatchTime);
    }

    function RedWin() {
        stateProp.Value = EndOfMatchStateValue;
        Ui.GetContext().Hint.Value = "Hint/EndOfMatch";

        const spawns = Spawns.GetContext();
        spawns.enable = false;
        spawns.Despawn();
        Game.GameOver(redTeam);
        mainTimer.Restart(EndOfMatchTime);
    }

    function RestartGame() {
        Game.RestartGame();
    }

    function SpawnTeams() {
        const spawns = Teams.Spawn();
        spawns.GetContext().Spawn();
    }

} catch (e) {
    Players.All.forEach(p => {
        p.PopUp(`${e.name}: ${e.message} ${e.stack}`);
    });
}
