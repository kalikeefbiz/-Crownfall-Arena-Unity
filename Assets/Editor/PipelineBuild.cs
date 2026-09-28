using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;

// The cloud build uses the checked-in scene list and this ordinary pre-build hook.
public sealed class PipelineBuild : IPreprocessBuildWithReport
{
    public int callbackOrder => 0;

    public void OnPreprocessBuild(BuildReport report)
    {
        if (report.summary.platform != BuildTarget.WebGL)
            throw new BuildFailedException("This repository is a Web pipeline test. Select WebGL in Build Automation.");
        Configure();
    }

    private static void Configure()
    {
        PlayerSettings.companyName = "Crownfall";
        PlayerSettings.productName = "Crownfall Unity Pipeline Test";
        PlayerSettings.defaultInterfaceOrientation = UIOrientation.AutoRotation;
        PlayerSettings.allowedAutorotateToPortrait = false;
        PlayerSettings.allowedAutorotateToPortraitUpsideDown = false;
        PlayerSettings.allowedAutorotateToLandscapeLeft = true;
        PlayerSettings.allowedAutorotateToLandscapeRight = true;
        PlayerSettings.defaultWebScreenWidth = 960;
        PlayerSettings.defaultWebScreenHeight = 540;
        PlayerSettings.WebGL.template = "PROJECT:PipelineTest";
        PlayerSettings.WebGL.compressionFormat = WebGLCompressionFormat.Gzip;
        PlayerSettings.WebGL.decompressionFallback = true;
        PlayerSettings.WebGL.dataCaching = false;
        PlayerSettings.stripEngineCode = true;
        PlayerSettings.SetManagedStrippingLevel(NamedBuildTarget.WebGL, ManagedStrippingLevel.High);
        EditorBuildSettings.scenes = new[] {
            new EditorBuildSettingsScene("Assets/Scenes/PipelineTest.unity", true)
        };
    }

    // Optional local/batch entry point once a Unity Editor is available.
    public static void BuildWeb()
    {
        Configure();
        BuildReport report = BuildPipeline.BuildPlayer(new BuildPlayerOptions {
            scenes = new[] { "Assets/Scenes/PipelineTest.unity" },
            locationPathName = "Builds/Web",
            target = BuildTarget.WebGL,
            options = BuildOptions.None
        });
        if (report.summary.result != BuildResult.Succeeded)
            throw new BuildFailedException("Web pipeline test build failed.");
    }
}
