import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "src/context/shadcntheme/ThemeContext";

type DocumentWithViewTransition = Document & {
  startViewTransition?: (updateCallback: () => void) => ViewTransition;
};

const LightDark = () => {
  const { theme: activeMode, setTheme: setActiveMode } = useTheme();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const toggleTheme = async () => {
    const toggleMode = () => {
      setActiveMode(activeMode === "light" ? "dark" : "light");
    };

    const documentWithTransition = document as DocumentWithViewTransition;
    const transition = documentWithTransition.startViewTransition?.(toggleMode);

    if (!transition) {
      toggleMode();
      return;
    }

    await transition.ready;

    document.documentElement.animate(
      {
        clipPath: ["inset(0 0 100% 0)", "inset(0)"],
      },
      {
        duration: 800,
        easing: "ease-in-out",
        pseudoElement: "::view-transition-new(root)",
      }
    );
  };

  if (!isMounted) return null;

  const ThemeIcon = activeMode === "light" ? Moon : Sun;

  return (
    <div>
      <Button
        variant="ghost"
        className="h-10 w-10 cursor-pointer rounded-full hover:bg-primary/5"
        onClick={toggleTheme}
      >
        <ThemeIcon className="size-5" />
      </Button>
    </div>
  );
};

export default LightDark;


