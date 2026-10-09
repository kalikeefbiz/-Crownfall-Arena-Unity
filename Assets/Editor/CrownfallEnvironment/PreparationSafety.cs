#nullable disable
using System;
using System.Runtime.ExceptionServices;

namespace Crownfall.EnvironmentLab.Editor
{
    // Deterministic lifecycle; linked directly into the license-free regression runner.
    public sealed class PreparationSafety
    {
        readonly Action<string> compare, secondary;
        readonly Action<Exception> primaryDiagnostic;
        public string Phase { get; private set; }
        public PreparationSafety(Action<string> comparison, Action<string> secondaryDiagnostic, Action<Exception> originalFailure = null)
        { compare = comparison; secondary = secondaryDiagnostic; primaryDiagnostic = originalFailure ?? (error => { }); Phase = "initial snapshot"; }
        public void Step(string phase, Action operation)
        { Phase = phase; operation(); compare(phase); }
        void BestEffort(string phase, Action operation)
        { DiagnosticSafety.Attempt(phase, operation, secondary); }
        public void Run(Action operation, Action cleanup, Action<Exception> reportFailure)
        {
            Exception primary = null;
            try { operation(); }
            catch (Exception error)
            {
                primary = error;
                BestEffort("primary failure record", () => primaryDiagnostic(error));
                BestEffort("exceptional-exit comparison", () => compare("exception during " + Phase));
            }
            finally
            {
                try { cleanup(); }
                catch (Exception error)
                {
                    if (primary == null) { primary = error; BestEffort("primary failure record", () => primaryDiagnostic(error)); }
                    else BestEffort("cleanup diagnostic", () => secondary("Cleanup after " + Phase + ": " + error));
                }
                try { compare("final after cleanup/restoration; last operation=" + Phase); }
                catch (Exception error)
                {
                    if (primary == null) { primary = error; BestEffort("primary failure record", () => primaryDiagnostic(error)); }
                    else BestEffort("final comparison diagnostic", () => secondary("Final protection comparison: " + error));
                }
            }
            if (primary != null)
            {
                var original = primary;
                BestEffort("failure report", () => reportFailure(original));
                ExceptionDispatchInfo.Capture(original).Throw();
            }
        }
    }
    public static class DiagnosticSafety
    {
        public static void Attempt(string phase, Action operation, Action<string> secondary)
        {
            try { operation(); }
            catch (Exception error)
            {
                // A broken sink must not recurse or replace the primary exception.
                try { secondary(phase + ": " + error); } catch (Exception) { }
            }
        }
    }
}
