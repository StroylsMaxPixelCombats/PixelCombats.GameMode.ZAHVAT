// Импорты:
import * as Basic from 'pixel_combats/basic';
import * as Room from 'pixel_combats/room';

// Создаём, команды:
Room.Teams.Add('Blue', '<b><size=30><color=#0d177c>ß</color><color=#03088c>l</color><color=#0607b0>ᴜ</color><color=#1621ae>E</color></size></b>', new Basic.Color(0, 0, 1, 0));
Room.Teams.Add('Red', '<b><size=30><color=#962605>尺</color><color=#9a040c>ᴇ</color><color=#b8110b>D</color></size></b>', new Basic.Color(1, 0, 0, 0));
let RedTeam = Room.Teams.Get('Red');
let BlueTeam = Room.Teams.Get('Blue');
BlueTeam.Spawns.SpawnPointsGroups.Add(1), 
RedTeam.Spawns.SpawnPointsGroups.Add(2),
BlueTeam.Build.BlocksSet.Value = Room.BuildBlocksSet.Blue,  
RedTeam.Build.BlocksSet.Value = Room.Build.BlocksSet.Red;

// Параметры, создания - комнаты;
Room.Map.Rotation = Room.GameMode.Parameters.GetBool('MapRotation');
Room.BreackGraph.OnlyPlayerBlocksDmg = Room.GameMode.Parameters.GetBool('PartialDesruction');
Room.BreackGraph.WeakBlocks = Room.GameMode.Parameters.GetBool('LoosenBlocks');
Room.Damage.GetContext().FriendlyFire.Value = Room.GameMode.Parameters.GetBool('FriendlyFire');
// Опции, включенные - при создании:
Room.BreackGraph.PlayerBlockBoost = true; // Блок, игрока - всегда, усилен.
Room.Damage.GetContext().DamageOut.Value = true; // Урон.
Room.Properties.GetContext().GameModeName.Value = 'GameModes/Team Dead Match'; // Название, режима.
Room.TeamsBalancer.IsAutoBalance = true; // Авто, баланс - команд.
Room.Ui.GetContext().MainTimerId.Value = MainTimer.Id; // Индификатор, времени.

// Константы, с переменными:
const WaitingPlayersTime = 11;
const BuildModeTime = 61;
const GameModeTime = 301;
const End0fMatchTime = 11;
const DefPoints = GameModeTime * 0.2;
const DefPointsMaxCount = 30;
const DefTimerTickInderval = 1;
const SavePointsCount = 10;
const RepairPointsBySecond = 0.5;
const CapturePoints = 10;
const MaxCapturePoints = 15;
const RedCaptureW = 1;
const BlueCaptureW = 2;
const CaptureRestoreW = 1;
const MaxSpawnsByArea = 25;
const UnCapturedColor = new Basic.Color(1, 1, 1, 1);
const FakeCapturedColor = new Basic.Color(0, 1, 0, 0);
const CapturedColor = new Basic.Color(1, 0, 0, 0);

const WaitingStateValue = 'Waiting';
const BuildModeStateValue = 'BuildMode';
const GameStateValue = 'Game';
const End0fMatchStateValue = 'End0fMatch';
const DefAreaTag = 'Def';
const CaptureAreaTag = 'Capture';
const CaptureZoneBlueHINT = '!Красные, захватывают - синию: зону!';
const 








