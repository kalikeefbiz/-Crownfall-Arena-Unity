using UnityEngine;

// Pipeline proof only: one cube, one label, one touch/click response.
public sealed class PipelineTouchTest : MonoBehaviour
{
    [SerializeField] private Camera testCamera;
    [SerializeField] private Renderer testObject;
    private Material instanceMaterial;
    private bool changed;
    private GUIStyle titleStyle;

    private void Awake()
    {
        Application.targetFrameRate = 30;
        // Handle real touches explicitly; do not also synthesize a mouse click.
        Input.simulateMouseWithTouches = false;
        instanceMaterial = testObject.material;
    }

    private void Update()
    {
        if (Input.touchCount > 0)
        {
            for (int i = 0; i < Input.touchCount; i++)
            {
                Touch touch = Input.GetTouch(i);
                if (touch.phase == TouchPhase.Began)
                {
                    TryTap(touch.position);
                    break;
                }
            }
        }
        else if (Input.GetMouseButtonDown(0))
        {
            TryTap(Input.mousePosition);
        }
    }

    private void TryTap(Vector2 position)
    {
        if (!Physics.Raycast(testCamera.ScreenPointToRay(position), out RaycastHit hit, 30f)
            || hit.transform != testObject.transform)
            return;

        changed = !changed;
        instanceMaterial.color = changed
            ? new Color(1f, 0.35f, 0.15f)
            : new Color(0.1f, 0.85f, 0.8f);
        testObject.transform.localScale = Vector3.one * (changed ? 2.1f : 1.6f);
    }

    private void OnGUI()
    {
        if (titleStyle == null)
            titleStyle = new GUIStyle(GUI.skin.label) { alignment = TextAnchor.MiddleCenter };
        titleStyle.fontSize = Mathf.Clamp(Mathf.RoundToInt(Screen.width / 30f), 16, 36);
        titleStyle.normal.textColor = Color.white;
        GUI.Label(new Rect(12, Screen.height * 0.07f, Screen.width - 24,
            titleStyle.fontSize * 2), "Crownfall Unity Pipeline Test", titleStyle);
    }

    private void OnDestroy()
    {
        if (instanceMaterial != null) Destroy(instanceMaterial);
    }
}
