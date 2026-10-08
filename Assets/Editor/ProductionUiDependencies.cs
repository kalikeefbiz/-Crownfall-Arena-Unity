using System;
using System.IO;
using UnityEditor;
using UnityEditor.Build;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.UIElements;
using Crownfall.Match;

namespace Crownfall.Editor
{
    // Native Editor serialization/import, not handwritten PanelSettings YAML.
    // Resources retains the panel -> theme -> imported default theme dependencies;
    // serialized shader fields plus Always Included retain all runtime UI variants.
    public static class ProductionUiDependencies
    {
        const string SpecificationPath="Docs/PRODUCTION_UI_DEPENDENCIES.json";
        const string Folder="Assets/Crownfall/GeneratedUI/Resources";
        const string ThemePath=Folder+"/CrownfallProductionTheme.tss";
        const string PanelPath=Folder+"/"+ProductionHud.PanelResource+".asset";
        [Serializable] sealed class ShaderBinding { public string field,name; }
        [Serializable] sealed class Specification { public string unityVersion,panelResource,themeSource; public ShaderBinding[] shaders; }
        static Specification Read()
        {
            var spec=JsonUtility.FromJson<Specification>(File.ReadAllText(SpecificationPath));
            Require(spec!=null&&spec.unityVersion==Application.unityVersion,"UI dependency specification must match the actual Editor");
            Require(spec.panelResource==ProductionHud.PanelResource&&spec.shaders!=null&&spec.shaders.Length==7,"UI dependency specification/binding missing");
            Require(spec.themeSource=="@import url(\"unity-theme://default\");","Default runtime theme import missing");
            return spec;
        }
        static SerializedProperty Property(SerializedObject obj,string name)
        {var p=obj.FindProperty(name);Require(p!=null,"Missing Unity serialized UI field: "+name);return p;}
        static SerializedObject Graphics()
        {var settings=GraphicsSettings.GetGraphicsSettings();Require(settings!=null,"Graphics settings missing");return new SerializedObject(settings);}
        static bool Contains(SerializedProperty shaders,Shader shader)
        {for(int i=0;i<shaders.arraySize;i++)if(shaders.GetArrayElementAtIndex(i).objectReferenceValue==shader)return true;return false;}

        [MenuItem("Crownfall/Prepare Production UI Dependencies")]
        public static void Prepare()
        {
            var spec=Read();Directory.CreateDirectory(Folder);
            if(!File.Exists(ThemePath)||File.ReadAllText(ThemePath)!=spec.themeSource)File.WriteAllText(ThemePath,spec.themeSource);
            AssetDatabase.Refresh(ImportAssetOptions.ForceSynchronousImport);
            AssetDatabase.ImportAsset(ThemePath,ImportAssetOptions.ForceSynchronousImport);
            var theme=AssetDatabase.LoadAssetAtPath<ThemeStyleSheet>(ThemePath);
            Require(theme!=null,"Production TSS import failed");
            var panel=AssetDatabase.LoadAssetAtPath<PanelSettings>(PanelPath);
            if(panel==null){panel=ScriptableObject.CreateInstance<PanelSettings>();AssetDatabase.CreateAsset(panel,PanelPath);}
            panel.themeStyleSheet=theme;panel.scaleMode=PanelScaleMode.ConstantPixelSize;panel.sortingOrder=10;
            var serializedPanel=new SerializedObject(panel);var graphics=Graphics();
            var included=Property(graphics,"m_AlwaysIncludedShaders");
            foreach(var binding in spec.shaders)
            {
                // Find resolves Editor built-ins; retention is the persisted references below.
                var shader=Shader.Find(binding.name);Require(shader!=null,"Required production UI shader unavailable: "+binding.name);
                Property(serializedPanel,binding.field).objectReferenceValue=shader;
                if(!Contains(included,shader))included.GetArrayElementAtIndex(included.arraySize++).objectReferenceValue=shader;
            }
            serializedPanel.ApplyModifiedPropertiesWithoutUndo();graphics.ApplyModifiedPropertiesWithoutUndo();
            EditorUtility.SetDirty(panel);EditorUtility.SetDirty(graphics.targetObject);AssetDatabase.SaveAssets();
            Validate();
        }
        public static void Validate()
        {
            var spec=Read();var panel=AssetDatabase.LoadAssetAtPath<PanelSettings>(PanelPath);
            var theme=AssetDatabase.LoadAssetAtPath<ThemeStyleSheet>(ThemePath);
            Require(panel!=null&&theme!=null&&panel.themeStyleSheet==theme,"Shipping production PanelSettings/theme binding missing");
            Require(Resources.Load<PanelSettings>(ProductionHud.PanelResource)==panel,"Shipping Resources panel binding missing or ambiguous");
            Require(File.ReadAllText(ThemePath)==spec.themeSource,"Shipping theme source changed");
            var serializedTheme=new SerializedObject(theme);
            Require(!Property(serializedTheme,"m_ImportedWithErrors").boolValue,"Production theme imported with errors");
            var imports=Property(serializedTheme,"imports");
            Require(imports.arraySize==1&&imports.GetArrayElementAtIndex(0).FindPropertyRelative("styleSheet").objectReferenceValue!=null,"Runtime default theme dependency missing");
            var serializedPanel=new SerializedObject(panel);var included=Property(Graphics(),"m_AlwaysIncludedShaders");
            foreach(var binding in spec.shaders)
            {
                var shader=Property(serializedPanel,binding.field).objectReferenceValue as Shader;
                Require(shader!=null&&shader.name==binding.name&&Contains(included,shader),"UI shader binding/Always Included retention missing: "+binding.name);
            }
            Debug.Log("Production UI: imported default theme, Resources PanelSettings, seven serialized shader dependencies and Always Included retention validated.");
        }
        static void Require(bool condition,string message){if(!condition)throw new BuildFailedException("Production UI: "+message);}
    }
}
