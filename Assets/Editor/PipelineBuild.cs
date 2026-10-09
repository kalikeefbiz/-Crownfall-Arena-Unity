using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using Crownfall.EnvironmentLab.Editor;

// The cloud build uses the checked-in scene list and this ordinary pre-build hook.
public sealed class PipelineBuild : IPreprocessBuildWithReport
{
    public int callbackOrder => 0;

    public void OnPreprocessBuild(BuildReport report)
    {
        EnvironmentNativeValidation.RunProtected("player prebuild", guard => {
            guard.Step("prebuild configuration", () => Configure(report.summary.platform));
            guard.Step("prebuild production UI", () => Crownfall.Editor.ProductionUiDependencies.Prepare());
            guard.Step("prebuild gameplay validation", () => {
                Crownfall.Editor.M0Validation.Validate();
                Crownfall.Editor.CompleteMatchValidation.Validate();
            });
            guard.Step("prebuild wilderness", () => Crownfall.EnvironmentLab.Editor.WildernessBuildPreparation.PrepareAndValidate());
            guard.Step("prebuild production art validation", () => Crownfall.Editor.ProductionArtValidation.Validate());
        }, () => { }, error => EnvironmentNativeValidation.WriteFailure(error.ToString(), new string[0]));
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
        EnvironmentNativeValidation.RunProtected("local build configuration", guard => {
            guard.Step("prebuild configuration", () => Configure(BuildTarget.WebGL));
        }, () => { }, error => EnvironmentNativeValidation.WriteFailure(error.ToString(), new string[0]));
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
