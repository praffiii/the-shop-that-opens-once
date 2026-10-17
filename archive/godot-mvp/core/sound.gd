extends Node
## Music, the evening wind and small sound effects (autoload "Sound"). Every sound is exported from
## the presentation's synthesized audio (see tools/export-art). Music cross-fades between moods.

const FADE := 1.2 ## Seconds for one mood's music to cross-fade into the next.
const INDOOR_WIND := 0.2 ## The wind's volume indoors, as a fraction of outdoors.
const NAMES := [
	"music_dusk", "music_shop", "music_memory", "music_resolved", "wind",
	"bell", "tick", "chime", "motif", "page", "pop", "wrong", "right", "whoosh",
	"step_wood_0", "step_wood_1", "step_wood_2", "step_wood_3", "step_0", "step_1", "step_2", "step_3",
]

## Silences everything (the pause menu's sound switch).
var muted := false:
	set(value):
		muted = value
		AudioServer.set_bus_mute(0, value)

var _streams: Dictionary[String, AudioStream] = {}
var _music: Array[AudioStreamPlayer] = []
var _fades: Array[Tween] = [null, null, null] # one per music player, then the wind's
var _front := 0
var _mood := ""
var _wind := AudioStreamPlayer.new()
var _effects: Array[AudioStreamPlayer] = []
var _steps := 0


func _ready() -> void:
	for sound_name: String in NAMES:
		_streams[sound_name] = load("res://art/sound/%s.ogg" % sound_name)
		# Web builds play sounds as samples; registering them now avoids a hitch the first time.
		if OS.has_feature("web"):
			AudioServer.register_stream_as_sample(_streams[sound_name])
	for i in 8:
		var player := AudioStreamPlayer.new()
		add_child(player)
		(_music if i < 2 else _effects).append(player)
	_wind.stream = _streams.wind
	add_child(_wind)


## Stops everything that is playing. Call it, then wait a frame, before quitting: the audio server
## only lets go of sounds that were stopped while it was still running.
func stop_all() -> void:
	for player in find_children("*", "AudioStreamPlayer", false, false):
		player.stop()


## Cross-fades to a mood's music: dusk, shop, memory or resolved. Indoors, the wind drops.
func mood(new_mood: String, indoors := false) -> void:
	if not _wind.playing:
		_wind.volume_db = linear_to_db(0.001)
		_wind.play()
	_fade(2, _wind, INDOOR_WIND if indoors else 1.0)
	if new_mood == _mood:
		return
	_mood = new_mood
	_fade(_front, _music[_front], 0.0)
	_front = 1 - _front
	var player := _music[_front]
	player.stream = _streams["music_" + new_mood]
	player.volume_db = linear_to_db(0.001)
	player.play()
	_fade(_front, player, 1.0)


func play(sound_name: String) -> void:
	var player: AudioStreamPlayer = _effects[0]
	for p in _effects:
		if not p.playing:
			player = p
			break
	player.stream = _streams[sound_name]
	player.play()


## One footstep, cycling through its four variations.
func step(wood: bool) -> void:
	play(("step_wood_%d" if wood else "step_%d") % (_steps % 4))
	_steps += 1


func _fade(slot: int, player: AudioStreamPlayer, to: float) -> void:
	if _fades[slot]:
		_fades[slot].kill()
	var tween := create_tween()
	tween.tween_method(func(v: float) -> void: player.volume_db = linear_to_db(maxf(v, 0.001)), db_to_linear(player.volume_db), to, FADE)
	if to == 0.0:
		tween.tween_callback(player.stop)
	_fades[slot] = tween
