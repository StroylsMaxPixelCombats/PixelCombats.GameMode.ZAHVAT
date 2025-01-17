// Авторы:
TnT.
JavaScript.Capture = ("PixelCombats");

// Импорты:
import { DisplayValueHeader, Color } from "pixel_combats/basic";
import { Players, Inventory, Teams, Build, Ui, Game, Build, Properties, LeaderBoard, Damage, GameMode, Spawns, Timers, BreackGraph, TeamsBalancer, BuildBlocksSet, AreaPlayerTriggerService, AreaViewService } from "pixel_combats/room";

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





