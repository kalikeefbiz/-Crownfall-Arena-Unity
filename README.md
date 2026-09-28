# Crownfall Unity Pipeline Test

An isolated Web deployment proof. This is not Crownfall M0 or a gameplay migration.

## Pinned editor

Unity **6000.3.10f1** (Unity 6.3 LTS), built-in render pipeline.
Unity Build Automation lists the 6000.3 LTS family as supported:
https://docs.unity.com/en-us/build-automation/reference/supported-unity-versions
Release: https://unity.com/releases/editor/whats-new/6000.3.10f1

## Contents

One scene: `Assets/Scenes/PipelineTest.unity`. A navy camera background, a teal cube,
and the Unity-rendered label **Crownfall Unity Pipeline Test**. Tap/click the cube:
it toggles between teal/small and orange/large. Tapping outside it does nothing.
No external art, fonts, audio, URP, Input System package, or production UI framework.
Only four engine modules: IMGUI, legacy input, physics, and text rendering.

## Unity Build Automation configuration

- Repository: `kalikeefbiz/-Crownfall-Arena-Unity`
- Branch: `main`
- Project subdirectory: repository root (blank or `/`, as the dashboard requires)
- Platform: **Web / WebGL** (not iOS)
- Editor: **6000.3.10f1**; select that exact available patch
- Scene: `Assets/Scenes/PipelineTest.unity` (already enabled in EditorBuildSettings)
- Non-development build; no custom build method is needed
- The standard pre-build callback in `Assets/Editor/PipelineBuild.cs` applies Web settings
- Custom Web template: `PROJECT:PipelineTest`, already selected
- No signing certificate, provisioning profile, or Apple Developer membership is needed

The authenticated Unity cloud target has not been configured by this commit.
The repository alone does not trigger or prove a successful cloud build.

## Open on iPhone Safari

After a successful cloud build, use a hosted Web preview if supplied by the service,
or extract the Web build artifact and serve its complete contents over HTTPS.
Open the hosted `index.html` URL in Safari. A ZIP/download link or a local Files app
HTML file is not a playable Web deployment. Preserve the `Build/` folder beside
`index.html`. The template uses gzip with Unity decompression fallback for hosts
without custom Content-Encoding configuration; do not double-compress the files.

Turn off the phone's portrait orientation lock and rotate to either landscape side.
The page fits either landscape orientation and letterboxes the canvas in portrait.
Player settings enable landscape-left/right and disable portrait autorotation,
but Safari owns page orientation; these settings do not force a browser rotation.
No fullscreen/orientation-lock API is required. Render resolution is capped at 1x
CSS pixel density to keep this tiny test inexpensive on mobile.

Acceptance: Unity finishes loading; the title and cube appear; tapping the cube
changes its color AND size exactly once; tapping again restores it; both landscape
rotations work. A later second build should also load to prove update delivery.
This acceptance check has NOT been performed yet.

## Optional Unity batch build

With this exact Editor and Web Build Support installed:

    Unity -batchmode -quit -projectPath /path/to/project -buildTarget WebGL -executeMethod PipelineBuild.BuildWeb -logFile build.log

Output: `Builds/Web/` (ignored). All generated Unity directories are ignored.
The Editor generates omitted default settings and the package resolution lock on
first import. Asset GUIDs and scene references are checked in.

## Validation status

Source and project structure inspected only. Unity was not executed while preparing
this commit. Compilation, shader import, cloud build, hosting, and physical iPhone
runtime validation remain pending. No Crownfall gameplay or production assets.
