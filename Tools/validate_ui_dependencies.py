"""Fail-closed source contract for native Editor-generated shipping UI dependencies.
Does not substitute for executing the importer/serialization/build in Unity 6000.
"""
from pathlib import Path
import copy, json

ROOT=Path(__file__).resolve().parents[1]
EXPECTED={
    'm_AtlasBlitShader':'Hidden/Internal-UIRAtlasBlitCopy',
    'm_DefaultShader':'Hidden/Internal-UIRDefault',
    'm_RuntimeGaussianBlurShader':'Hidden/UIR/GaussianBlur',
    'm_RuntimeColorEffectShader':'Hidden/UIR/ColorEffect',
    'm_SDFShader':'Hidden/TextCore/Distance Field SSD',
    'm_BitmapShader':'Hidden/Internal-GUITextureClipText',
    'm_SpriteShader':'Hidden/TextCore/Sprite',
}
PATHS={
    'hud':'Assets/Crownfall/Match/Runtime/ProductionHud.cs',
    'builder':'Assets/Editor/ProductionUiDependencies.cs',
    'pipeline':'Assets/Editor/PipelineBuild.cs',
    'validator':'Assets/Editor/ProductionArtValidation.cs',
}

def check(spec,code):
    assert spec['unityVersion']=='6000.3.10f1'
    assert spec['panelResource']=='CrownfallProductionPanel'
    assert spec['themeSource']=='@import url("unity-theme://default");'
    assert len(spec['shaders'])==7 and {s['field']:s['name'] for s in spec['shaders']}==EXPECTED
    assert 'public const string PanelResource="'+spec['panelResource']+'";' in code['hud']
    for token in ('Resources.Load<PanelSettings>(PanelResource)','shippingPanel.themeStyleSheet==null',
                  'panel=UnityEngine.Object.Instantiate(shippingPanel)','document.panelSettings=panel'):
        assert token in code['hud'], 'Missing shipping UI binding: '+token
    assert 'CreateInstance<PanelSettings>' not in code['hud'] and 'CreateInstance<ThemeStyleSheet>' not in code['hud']
    prepare='Crownfall.Editor.ProductionUiDependencies.Prepare();'
    assert prepare in code['pipeline'] and code['pipeline'].index(prepare)<code['pipeline'].index('Crownfall.Editor.ProductionArtValidation.Validate();')
    assert 'ProductionUiDependencies.Validate();' in code['validator']
    for token in ('AssetDatabase.CreateAsset(panel,PanelPath)', 'ImportAssetOptions.ForceSynchronousImport',
                  'AssetDatabase.LoadAssetAtPath<ThemeStyleSheet>(ThemePath)',
                  'panel.themeStyleSheet=theme', 'Property(serializedPanel,binding.field).objectReferenceValue=shader',
                  'Property(graphics,"m_AlwaysIncludedShaders")', 'included.GetArrayElementAtIndex(included.arraySize++).objectReferenceValue=shader',
                  'serializedPanel.ApplyModifiedPropertiesWithoutUndo()', 'graphics.ApplyModifiedPropertiesWithoutUndo()',
                  'AssetDatabase.SaveAssets()', 'Validate();', 'Resources.Load<PanelSettings>(ProductionHud.PanelResource)==panel',
                  'panel.themeStyleSheet==theme', 'imports.arraySize==1', 'FindPropertyRelative("styleSheet").objectReferenceValue!=null',
                  'shader.name==binding.name&&Contains(included,shader)', 'throw new BuildFailedException',
                  'spec.unityVersion==Application.unityVersion'):
        assert token in code['builder'], 'Missing native dependency preparation/retention guard: '+token

def main():
    spec=json.loads((ROOT/'Docs/PRODUCTION_UI_DEPENDENCIES.json').read_text())
    code={k:(ROOT/p).read_text() for k,p in PATHS.items()}
    assert 'm_EditorVersion: '+spec['unityVersion'] in (ROOT/'ProjectSettings/ProjectVersion.txt').read_text()
    check(spec,code)
    # Negative checks exercise the same gate CI/current-build validation invokes.
    failures=0
    for token,key in [('document.panelSettings=panel','hud'),
                      ('Crownfall.Editor.ProductionUiDependencies.Prepare();','pipeline'),
                      ('ProductionUiDependencies.Validate();','validator'),
                      ('AssetDatabase.CreateAsset(panel,PanelPath)','builder'),
                      ('panel.themeStyleSheet=theme','builder'),
                      ('Property(serializedPanel,binding.field).objectReferenceValue=shader','builder'),
                      ('included.GetArrayElementAtIndex(included.arraySize++).objectReferenceValue=shader','builder'),
                      ('AssetDatabase.SaveAssets()','builder'),
                      ('shader.name==binding.name&&Contains(included,shader)','builder')]:
        broken=code.copy();broken[key]=broken[key].replace(token,'')
        try:check(spec,broken)
        except AssertionError:failures+=1
        else:raise AssertionError('UI dependency gate accepted missing '+token)
    for key,value in [('themeSource',''),('shaders',spec['shaders'][:-1]),('panelResource','missing')]:
        broken=copy.deepcopy(spec);broken[key]=value
        try:check(broken,code)
        except AssertionError:failures+=1
        else:raise AssertionError('UI dependency gate accepted invalid '+key)
    print(f'PASS: seven exact Unity 6000 UI shader bindings, imported default theme, native Resources panel generation, Always Included retention, shipping/prebuild wiring; {failures} fail-closed negative checks. Native Editor execution still required.')

if __name__=='__main__':main()
