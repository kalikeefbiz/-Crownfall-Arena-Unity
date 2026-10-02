using Crownfall.Combat;
using UnityEngine;

namespace Crownfall
{
    // Diagnostic composition only. All reusable combat lives on gameplay components/core.
    public sealed class M1CombatFixture : MonoBehaviour
    {
        [SerializeField] BasicAttackDefinition basic;
        [SerializeField] BasicSpriteSet basicSprites;
        [SerializeField] Material solidMaterial;
        [SerializeField] Material previewMaterial;
        [SerializeField, Min(1)] float kitHealth = 650;
        [SerializeField, Min(1)] float targetHealth = 1800;
        [SerializeField, Min(0.01f)] float targetRadius = 0.52f;
        [SerializeField] Vector3 targetPosition = new Vector3(2, 0.05f, -4);
        Combatant target;
        BasicAttackExecutor attack;
        SummonerRoot root;
        Material targetMaterial, coneMaterial;
        LineRenderer cone;
        readonly Vector3[] points = new Vector3[35];
        double lastDamage;
        string lastResult = "No damage yet";
        GUIStyle label;

        void Start()
        {
            // M0 creates the proven scene in Awake. This one-time fixture lookup leaves that
            // composition and all movement/input/camera sources byte-identical.
            root = FindFirstObjectByType<SummonerRoot>();
            if (root == null || basic == null || basicSprites == null)
                throw new System.InvalidOperationException("M1 fixture is missing its M0 root/definitions");
            var world = new CombatWorld();
            var player = root.gameObject.AddComponent<Combatant>();
            player.Bind(world, 1, 1, kitHealth, root.GetComponent<CharacterController>().radius);
            attack = root.gameObject.AddComponent<BasicAttackExecutor>();
            attack.Bind(root, player, world, basic);
            root.GetComponentInChildren<KitSpritePresentation>(true).BindBasic(attack, basicSprites);

            var dummy = new GameObject("M1 Enemy Target (diagnostic)");
            dummy.transform.position = targetPosition;
            target = dummy.AddComponent<Combatant>();
            target.Bind(world, 2, 2, targetHealth, targetRadius);
            var body = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            body.name = "Target presentation";
            body.transform.SetParent(dummy.transform, false);
            body.transform.localPosition = new Vector3(0, 0.9f, 0);
            body.transform.localScale = new Vector3(targetRadius * 2, 0.9f, targetRadius * 2);
            // Target registration/radius is authoritative; no contact damage or rigidbody.
            body.GetComponent<Collider>().enabled = false;
            Destroy(body.GetComponent<Collider>());
            targetMaterial = new Material(solidMaterial);
            targetMaterial.color = new Color(0.85f, 0.2f, 0.22f);
            body.GetComponent<Renderer>().sharedMaterial = targetMaterial;
            target.DamageReceived += OnDamage;
            var coneObject = new GameObject("Solar Whip diagnostic footprint");
            coneObject.transform.SetParent(transform, false);
            cone = coneObject.AddComponent<LineRenderer>();
            coneMaterial = new Material(previewMaterial);
            coneMaterial.color = new Color(1, 0.65f, 0.1f);
            cone.sharedMaterial = coneMaterial;
            cone.useWorldSpace = true; cone.widthMultiplier = 0.04f;
            cone.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            cone.receiveShadows = false;
        }
        void OnDamage(DamageResult result)
        {
            lastDamage = result.Applied;
            lastResult = result.Defeated ? "DEFEATED (no longer targetable)" : "Damage received";
            if (result.Defeated) targetMaterial.color = Color.gray;
        }
        void LateUpdate()
        {
            if (attack == null) return;
            var selection = root.Targeting;
            bool aiming = selection.Active && selection.Shape == TargetShape.Directional;
            cone.enabled = aiming || attack.Active;
            if (!cone.enabled) return;
            Vector3 origin = aiming ? root.WorldPosition : attack.CapturedOrigin;
            origin.y = 0.09f;
            Vector3 direction = aiming ? selection.Direction : attack.CapturedDirection;
            float center = Mathf.Atan2(direction.x, direction.z);
            float arc = basic.coneDegrees * Mathf.Deg2Rad;
            points[0] = origin;
            for (int i = 1; i < points.Length - 1; i++)
            {
                float angle = center - arc / 2 + arc * (i - 1) / (points.Length - 3);
                points[i] = origin + new Vector3(Mathf.Sin(angle), 0, Mathf.Cos(angle)) * basic.range;
            }
            points[points.Length - 1] = origin;
            cone.positionCount = points.Length; cone.SetPositions(points);
        }
        void OnGUI()
        {
            if (target == null) return;
            if (label == null) label = new GUIStyle(GUI.skin.box) { alignment = TextAnchor.UpperLeft, wordWrap = true };
            Rect safe = Screen.safeArea;
            float s = Mathf.Max(0.4f, Mathf.Min(safe.width / 960f, safe.height / 540f));
            float x = safe.xMin + 12 * s, y = Screen.height - safe.yMax + 110 * s;
            label.fontSize = Mathf.RoundToInt(15 * s);
            GUI.Box(new Rect(x, y, 590 * s, 82 * s),
                "M1 Solar Whip | " + attack.LastConfirmation + "\n" +
                "Attacks " + attack.AttackCount + " | Combo " + (attack.ComboStep + 1) + " | Hits " + attack.HitEvents +
                " (targets " + attack.LastHitTargets + ") | " + attack.Phase + " " + attack.CooldownRemaining.ToString("0.00") + "s\n" +
                "Enemy " + target.Health.Current.ToString("0") + "/" + target.Health.Maximum.ToString("0") +
                " | Last damage " + lastDamage.ToString("0") + " | " + lastResult, label);
            if (GUI.Button(new Rect(x, y + 88 * s, 190 * s, 38 * s), "RESET TEST TARGET"))
            {
                target.ResetDiagnosticHealth(); lastDamage = 0; lastResult = "Diagnostic reset";
                targetMaterial.color = new Color(0.85f, 0.2f, 0.22f);
            }
        }
        void OnDestroy()
        {
            if (target != null) { target.DamageReceived -= OnDamage; Destroy(target.gameObject); }
            if (targetMaterial != null) Destroy(targetMaterial);
            if (coneMaterial != null) Destroy(coneMaterial);
        }
    }
}
