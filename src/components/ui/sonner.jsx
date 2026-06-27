import { Toaster as Sonner } from "sonner";

const Toaster = ({ ...props }=> {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames,
      }}
      {...props}
    />
  );
};

export { Toaster };
