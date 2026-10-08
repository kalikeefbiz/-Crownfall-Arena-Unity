using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;

// The cloud build uses the checked-in scene list and this ordinary pre-build hook.
public sealed class PipelineBuild : IPreprocessBuildWithReport
{
    public int callbackOrder => 0;

    public void OnPreprocessBuild(BuildReport report)
    {
        Configure(report.summary.platform);
        Crownfall.Editor.M0Validation.Validate();
        Crownfall.Editor.CompleteMatchValidation.Validate();
        Crownfall.Editor.ProductionArtValidation.Validate();
    }

    private static void Configure(BuildTarget target)
    {
        PlayerSettings.companyName = "Crownfall";
        PlayerSettings.productName = "Crownfall Arena";
        PlayerSettings.defaultInterfaceOrientation = UIOrientation.AutoRotation;
        PlayerSettings.allowedAutorotateToPortrait = false;
        PlayerSettings.allowedAutorotateToPortraitUpsideDown = false;
        PlayerSettings.allowedAutorotateToLandscapeLeft = true;
        PlayerSettings.allowedAutorotateToLandscapeRight = true;
        if (target == BuildTarget.WebGL)
        {
            PlayerSettings.defaultWebScreenWidth = 960;
            PlayerSettings.defaultWebScreenHeight = 540;
            PlayerSettings.WebGL.template = "PROJECT:PipelineTest";
            PlayerSettings.WebGL.compressionFormat = WebGLCompressionFormat.Gzip;
            PlayerSettings.WebGL.decompressionFallback = true;
            PlayerSettings.WebGL.dataCaching = false;
            PlayerSettings.stripEngineCode = true;
            PlayerSettings.SetManagedStrippingLevel(NamedBuildTarget.WebGL, ManagedStrippingLevel.High);
        }
        EditorBuildSettings.scenes = new[] {
            new EditorBuildSettingsScene("Assets/Scenes/CrownfallMatch.unity", true)
        };
    }

    // Optional local/batch entry point once a Unity Editor is available.
    public static void BuildWeb()
    {
        Configure(BuildTarget.WebGL);
        BuildReport report = BuildPipeline.BuildPlayer(new BuildPlayerOptions {
            scenes = new[] { "Assets/Scenes/CrownfallMatch.unity" },
            locationPathName = "Builds/Web",
            target = BuildTarget.WebGL,
            options = BuildOptions.None
        });
        if (report.summary.result != BuildResult.Succeeded)
            throw new BuildFailedException("Crownfall match Web build failed.");
    }
}
