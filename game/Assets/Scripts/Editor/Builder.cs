using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace Shop.Editor
{
    /// <summary>
    /// The one scene: an object with <see cref="Main"/>, which builds everything else in code.
    /// Run from the Shop menu, or: Unity -batchmode -quit -projectPath game -executeMethod Shop.Editor.Builder.SetUp
    /// </summary>
    public static class Builder
    {
        const string Scene = "Assets/Scenes/Main.unity";

        [MenuItem("Shop/Set up the main scene")]
        public static void SetUp()
        {
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            new GameObject("Main").AddComponent<Main>();
            EditorSceneManager.SaveScene(scene, Scene);
            EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(Scene, true) };
            AssetDatabase.DeleteAsset("Assets/Scenes/SampleScene.unity");
        }
    }
}
