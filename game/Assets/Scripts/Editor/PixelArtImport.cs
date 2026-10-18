using UnityEditor;
using UnityEngine;

namespace Shop.Editor
{
    /// <summary>
    /// Imports the exported art as it was drawn: no filtering, no mipmaps, no compression, no resizing.
    /// Walk masks stay readable, so WalkMap can read their pixels.
    /// </summary>
    sealed class PixelArtImport : AssetPostprocessor
    {
        void OnPreprocessTexture()
        {
            if (!assetPath.StartsWith("Assets/Resources/Art/")) return;
            var t = (TextureImporter)assetImporter;
            t.textureType = TextureImporterType.Default;
            t.npotScale = TextureImporterNPOTScale.None;
            t.mipmapEnabled = false;
            t.filterMode = FilterMode.Point;
            t.wrapMode = TextureWrapMode.Clamp;
            t.textureCompression = TextureImporterCompression.Uncompressed;
            t.alphaIsTransparency = true;
            t.maxTextureSize = 8192;
            t.isReadable = assetPath.EndsWith("/walk.png");
        }
    }
}
