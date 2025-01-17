// Авторы:
TnT.
JavaScript.Capture = ("PixelCombats");

// Импорты:
import { DisplayValueHeader, Color } from "pixel_combats/basic";
import { Players, Inventory, Teams, Build, Ui, Game, Build, Properties, LeaderBoard, Damage, GameMode, Spawns, Timers, BreackGraph, TeamsBalancer, BuildBlocksSet, AreaPlayerTriggerService, AreaViewService } from "pixel_combats/room";

// Константы, таймера:
 var WaitingPlayersTime = 11;
 var BuildBaseTime = 61;
 var GameModeTime = 301;
 var EndOfMatchTime = 11;
// Константы:
 var DefTimerTickInderval = 2;
 var DefPoints = GameModeTime * 0.2;
 var DefPointsMaxCount = 30;
 var SavePointsCount = 10;
 var RepairPointsBySecond = 0.5;
 var CapturePoints = 10;
 var MaxCapturePoints = 15;
 var RedCaptureW = 1;
 var BlueCaptureW = 2;
 var CaptureRestoreW = 1;
 var MaxSpawnsByArea = 25;
// Константы, цвета:
 var UnCapturedColor = new Color(1, 1, 1, 0);
 var FakeCapturedColor = new Color(0, 1, 0, 0);
 var CapturedColor = new Color(1, 0, 0, 0);

// Константы, имён:
 var WaitingStateValue = "Waiting";
 var BuildModeStateValue = "BuildMode";
 var GameStateValue = "Game";
 var EndOfMatchStateValue = "EndOfMatch";
 var DefAreaTag = "def";
 var CaptureAreaTag = "capture";
 var HoldPositionHint = "GameModeHint/HoldPosition";
 var RunToBliePointHint = "GameModeHint/RunToBliePoint";
 var DefBlueAreaHint = "GameModeHint/DefBlueArea";
 var DefThisAreaHint = "GameModeHint/DefThisArea";
 var WaitingForBlueBuildHint = "GameModeHint/WaitingForBlueBuild";
 var ChangeTeamHint = "GameModeHint/ChangeTeam";
 var YourAreaIsCapturing = "GameModeHint/YourAreaIsCapturing";
 var PrepareToDefBlueArea = "GameModeHint/PrepareToDefBlueArea";

// Постоянные, переменные:
const mainTimer = Timers.GetContext().Get("Main");
var DefTickTimer = Timers.getContext().Get("DefTimer");
var stateProp = Properties.GetContext().Get("State");
var DefAreas = AreaService.GetByTag("DefAreaTag");
const CaptureAreas = AreaService.GetByTag("CaptureAreaTag");
let CaptureTriggers = [];
let CaptureViews = [];
let CaptureProperties = [];
const CapturedAreaIndexProp = Properties.GetContext().Get("RedCaptiredIndex");

// Задаём, цвет - всем зонам, для - захвата:
Map.OnLoad.Add(function() {
 InitializeDefAreas();
});

function InitializeDefAreas() {
	DefAreas = AreaService.GetByTag("DefAreaTag");
	CaptureAreas = AreaService.GetByTag("CaptureAreaTag");
// Ограничитель:
	if (CaptureAreas == null) return;
	if (CaptureAreas.length == 0) return;
	CaptureTriggers = [];
	CaptureViews = [];
	CaptureProperties = [];

	// Сортировка, зон:
	CaptureAreas.sort(function(A1, B2) {
	 if (A1.Name > B2.Name) return 1;
	 if (A1.Name < B2.Name) return -1;
	return 0;
	});

// Инициализация, переменных:
	for (var i = 0; i < CaptureAreas.length; ++i) {
// Создаем, визуализатор:
 var View = AreaViewService.GetContext().Get(CaptureAreas[i].Name + "View");
 CaptureViews.push("View");
// Создаём - триггер:
 var Trigger = AreaPlayerTriggerService.Get(CaptureAreas[i].Name + "Trigger");
 CaptureTriggers.push("Trigger");
// Создаём, свойство - для захвата:
 var Prop = Properties.GetContext().Get(CaptureAreas[i].Name + "Property");
  Prop.OnValue.Add("CapturePropOnValue");
  CaptureProperties.push("Prop");
	}
}
InitializeDefAreas();
function LogTrigger(Player, Trigger) {
 log.debug("вошли в " + Trigger);
}
  
// Настройки, создания - комнаты:
Damage.FriendlyFire = GameMode.Parameters.GetBool("FriendlyFire");
BreackGraph.OnlyPlayerBlocksDmg = GameMode.Parameters.GetBool("PartialDesruction");
BreackGraph.WeakBlocks = GameMode.Parameters.GetBool("LoosenBlocks");
Map.Rotation = GameMode.Parameters.GetBool("MapRotation");

// Настройки, игры:
BreackGraph.PlayerBlockBoost = true;
Properties.GetContext().GameModeName.Value = "GameModes/Capture The Blue Dots, Or Defend Them!";
TeamsBalancer.IsAutoBalance = true;
Ui.GetContext().MainTimerId.Value = mainTimer.Id;
// Стандартные - команды:
Teams.Add("Blue", "<b><size=30><color=#0d177c>ß</color><color=#03088c>l</color><color=#0607b0>ᴜ</color><color=#1621ae>E</color></size></b>", new Color(0, 0, 1, 0));
Teams.Add("Red", "<b><size=30><color=#962605>尺</color><color=#9a040c>ᴇ</color><color=#b8110b>D</color></size></b>", new Color(1, 0, 0, 0));
var BlueTeam = Teams.Get("Blue");
var RedTeam = Teams.Get("Red");
BlueTeam.Spawns.SpawnPointsGroups.Get(1);
RedTeam.Spawns.SpawnPointsGroups.Get(2);
BlueTeam.Build.BlocksSet.Value = BuildBlocksSet.Blue;
RedTeam.Build.BlocksSet.Value = BuildBlocksSet.Red;

// Таймер, спавна - для команд:
BlueTeam.Spawns.RespawnTime.Value = 5;
RedTeam.Spawns.RespawnTime.Value = 10;
// Максимальное, количество - очков команды, синих - красных:
var MaxDeaths = Players.MaxCount * 5;
BlueTeam.Properties.Get("Deaths").Value = DefPoints;
RedTeam.Properties.Get("Deaths").Value = MaxDeaths;
// Выводим, в лидерБордах:
LeaderBoard.PlayerLeaderBoardValues = [
	{
		Value: "Kills",
		DisplayName: "<b><size=30><color=#be5f1b>K</color><color=#b65219>i</color><color=#ae4517>l</color><color=#a63815>l</color><color=#9e2b13>s</color></size></b>",
		ShortDisplayName: "<b><size=30><color=#be5f1b>K</color><color=#b65219>i</color><color=#ae4517>l</color><color=#a63815>l</color><color=#9e2b13>s</color></size></b>"
	},
	{
		Value: "Deaths",
		DisplayName: "<b><size=30><color=#be5f1b>D</color><color=#b85519>e</color><color=#b24b17>a</color><color=#ac4115>t</color><color=#a63713>h</color><color=#a02d11>s</color></size></b>",
		ShortDisplayName: "<b><size=30><color=#be5f1b>D</color><color=#b85519>e</color><color=#b24b17>a</color><color=#ac4115>t</color><color=#a63713>h</color><color=#a02d11>s</color></size></b>"
	},
	{
		Value: "Spawns",
		DisplayName: "<b><size=30><color=#be5f1b>S</color><color=#b85519>p</color><color=#b24b17>a</color><color=#ac4115>w</color><color=#a63713>n</color><color=#a02d11>s</color></size></b>",
		ShortDisplayName: "<b><size=30><color=#be5f1b>S</color><color=#b85519>p</color><color=#b24b17>a</color><color=#ac4115>w</color><color=#a63713>n</color><color=#a02d11>s</color></size></b>"
	},
	{
		Value: "Scores",
		DisplayName: "<b><size=30><color=#be5f1b>S</color><color=#b85519>c</color><color=#b24b17>o</color><color=#ac4115>r</color><color=#a63713>e</color><color=#a02d11>s</color></size></b>",
		ShortDisplayName: "<b><size=30><color=#be5f1b>S</color><color=#b85519>c</color><color=#b24b17>o</color><color=#ac4115>r</color><color=#a63713>e</color><color=#a02d11>s</color></size></b>"
	}
];
LeaderBoard.TeamLeaderBoardValue = {
	Value: "Deaths",
	DisplayName: "<b><size=30><color=#be5f1b>D</color><color=#b85519>e</color><color=#b24b17>a</color><color=#ac4115>t</color><color=#a63713>h</color><color=#a02d11>s</color></size></b>",
	ShortDisplayName: "<b><size=30><color=#be5f1b>D</color><color=#b85519>e</color><color=#b24b17>a</color><color=#ac4115>t</color><color=#a63713>h</color><color=#a02d11>s</color></size></b>"
};
// Вес, игрока - в лидерБорде:
LeaderBoard.PlayersWeightGetter.Set(function(Player) {
  return Player.Properties.Get("Kills").Value;
});

// Задаём, что выводить - в табе:
Ui.GetContext().TeamProp1.Value = { Team: "Blue", Prop: "Deaths" };

// Разрешения, игроку - в игре:
Teams.OnRequestJoinTeam.Add(function(Player, Team) { 
 Teams.Add("Player");
});
Teams.OnPlayerChangeTeam.Add(function(Player) {
 Player.Spawns.Spawn();
});

// Создаём щит, после спавна - игрока:
var immortalityTimerName = "immortality";
Spawns.GetContext().OnSpawn.Add(function(Player){
	Player.Properties.Immortality.Value = true;
	Timer = Player.Timers.Get("immortalityTimerName").Restart(5);
});
Timers.OnPlayerTimer.Add(function(Timer){
	if (Timer.Id != immortalityTimerName) return;
	Timer.Player.Properties.Immortality.Value = false;
});

// Если в команде, количеством смертей - занулилось, то завершаем - игру:
Properties.OnTeamProperty.Add(function(Context, Value) {
 if (Context.Team != BlueTeam) return;
 if (Value.Name !== "Deaths") return;
if (Value.Value <= 0) RedWin();
});

// Счётчик, спавнов:
Spawns.OnSpawn.Add(function(Player) {
 ++Player.Properties.Spawns.Value;
});

// Счётчик - смертей:
Damage.OnDeath.Add(function(Player) {
 ++Player.Properties.Deaths.Value;
});

// Счётчик, убийств:
Damage.OnKill.Add(function(Player, Killed) {
 if (Killed.Team != null && Killed.Team != Player.Team) {
  ++Player.Properties.Kills.Value;
  Player.Propertues.Scores.Value += 100;
     }
});

// Настройки - переключения, режимов:
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

// Задаём, первое игровое - состояние:
SetWaitingMode();

// Состояние, игры:
function SetWaitingMode() {
 stateProp.Value = "WaitingStateValue";
  Ui.GetContext().Hint.Value = "Ожидание, игроков...";
  Spawns.GetContext().Enable = false;
 mainTimer.Restart("WaitingPlayersTime");
}
function SetBuildMode() {
 stateProp.Value = "BuildModeStateValue";
  Ui.GetContext().Hint.Value = ChangeTeamHint;
 BlueTeam.Ui.Hint.Value = PrepareToDefBlueArea;
 RedTeam.Ui.Hint.Value = WaitingForBlueBuildHint;

 BlueTeam.Inventory.Main.Value = false;
 BlueTeam.Inventory.Secondary.Value = false;
 BlueTeam.Inventory.Melee.Value = true;
 BlueTeam.Inventory.Explosive.Value = false;
 BlueTeam.Inventory.Build.Value = true;
  
 RedTeam.Inventory.Main.Value = false;
 RedTeam.Inventory.Secondary.Value = false;
 RedTeam.Inventory.Melee.Value = true;
 RedTeam.Inventory.Explosive.Value = false;
 RedTeam.Inventory.Build.Value = true;

mainTimer.Restart("BuildBaseTime");
 Spawns.GetContext().Enable = true;
SpawnTeams();

// Инициализация, режима:
for (var i = 0; i < CaptureAreas.length; ++i) {
// Визуализатор:
var View = CaptureViews["i"];
View.Area = CaptureAreas["i"];
View.Color = "UnCapturedColor";
View.Enable = i == 0;
// Триггер:
var Trigger = CaptureTriggers["i"];
Trigger.Area = CaptureAreas["i"];
Trigger.Enable = true;
Trigger.OnEnter.Add("LogTrigger");
// Свойство, для - захвата:
var Prop = CaptureProperties["i"];
 Prop.Value = 0;
}

}
function SetGameMode() {
 stateProp.Value = "GameStateValue";
  Ui.GetContext().Hint.Value = "!Атакуйте, врагов!";
 BlueTeam.Ui.Hint.Value = DefBlueAreaHint;
 RedTeam.Ui.Hint.Value = RunToBliePointHint;


BlueTeam.Inventory.Main.Value = true;
BlueTeam.Inventory.MainInfinity.Value = true;
BlueTeam.Inventory.Secondary.Value = true;
BlueTeam.Inventory.SecondaryInfinity.Value = true;
BlueTeam.Inventory.Melee.Value = true;
BlueTeam.Inventory.Explosive.Value = true;
BlueTeam.Inventory.Build.Value = true;

RedTeam.Inventory.Main.Value = true;
RedTeam.Inventory.Secondary.Value = true;
RedTeam.Inventory.Melee.Value = true;
RedTeam.Inventory.Explosive.Value = true;
RedTeam.Inventory.Build.Value = true

mainTimer.Restart("GameModeTime");
 defTickTimer.RestartLoop("DefTimerTickInderval");
 Spawns.GetContext().Despawn();
SpawnTeams();

}
function BlueWin() {
 stateProp.Value = "EndOfMatchStateValue";
  Ui.GetContext().Hint.Value = "!Конец, матча - победа: синих!";

 var spawns = Spawns.GetContext();
 spawns.Enable = false;
 spawns.Despawn();

 Game.GameOver("BlueTeam");
  mainTimer.Restart("EndOfMatchTime");

}
function RedWin() {
 stateProp.Value = "EndOfMatchStateValue";
  Ui.GetContext().Hint.Value = "!Конец, матча - победа: красных!";

var spawns = Spawns.GetContext();
spawns.Enable = false;
spawns.Despawn();

Game.GameOver("RedTeam");
 mainTimer.Restart("EndOfMatchTime");

}
function RestartGame() {
 Game.RestartGame();
}
function SpawnTeams() {
 BlueTeam.Spawns.Spawn();
 RedTeam.Spawns.Spawn();
}

  

  
   








