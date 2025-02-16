import * as Basic from 'pixel_combats/basic';
import * as Room from 'pixel_combats/room';

Room.Teams.Add('Blue', '<b><size=30><color=#0d177c>ß</color><color=#03088c>l</color><color=#0607b0>ᴜ</color><color=#1621ae>E</color></size></b>', new Basic.Color(0, 0, 1, 0));
Room.Teams.Add('Red', '<b><size=30><color=#962605>尺</color><color=#9a040c>ᴇ</color><color=#b8110b>D</color></size></b>', new Basic.Color(1, 0, 0, 0));
let RedTeam = Room.Teams.Get('Red');
let BlueTeam = Room.Teams.Get('Blue');
BlueTeam.Spawns.SpawnPointsGroups.Add(1), 
RedTeam.Spawns.SpawnPointsGroups.Add(2),
BlueTeam.Build.BlocksSet.Value = Room.BuildBlocksSet.Blue,  
RedTeam.Build.BlocksSet.Value = Room.Build.BlocksSet.Red;

Room.Map.Rotation = Room.GameMode.Parameters.GetBool('MapRotation');
Room.BreackGraph.OnlyPlayerBlocksDmg = Room.GameMode.Parameters.GetBool('PartialDesruction');
Room.BreackGraph.WeakBlocks = Room.GameMode.Parameters.GetBool('LoosenBlocks');
Room.Damage.GetContext().FriendlyFire.Value = Room.GameMode.Parameters.GetBool('FriendlyFire');
Room.BreackGraph.PlayerBlockBoost = true; 
Room.Damage.GetContext().DamageOut.Value = true; 
Room.Properties.GetContext().GameModeName.Value = 'GameModes/Team Dead Match';
Room.TeamsBalancer.IsAutoBalance = true; 
Room.Ui.GetContext().MainTimerId.Value = MainTimer.Id; 

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
const CaptureZoneBlueHint = '!Красные, захватывают - синию зону!';
const CaptureTeamsBlueHint = '!Защитите, синию зону - с белыми, зонами!';
const CaptureZoneRedHint = '!Захватывайте, синию - зону, и атакуйте всех - синих!';
const CaptureTeamsRedHint = '!Захватите, синию зону, с белыми - зонами!';

const MainTimer = Room.Timers.GetContext().Get('Main');
const DefTickTimer = Room.Timers.GetContext().Get('DefTimer');
const StateProp = Room.Properties.GetContext().Get('State');
const DefAreas = Room.AreaService.GetByTag(DefAreaTag);
const CaptureAreas = Room.AreaService.GetByTag(CaptureAreaTag);
let CaptureTriggers = [];
let CaptureViews = [];
let CaptureProperties = [];
let CapturedAreaIndexProp = Room.Properties.GetContext().Get('RedCaptiredIndex');












