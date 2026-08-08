export const metadata = {
  title: "Trecento Network",
  description: "Visual network of Trecento artists, schools, activity, and influence."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
