sed -i 's/cristy-beauty/aura-beauty/g' wrangler.jsonc package.json
sed -i 's/Cristy Beauty/Aura Beauty/g' .dev.vars.example
grep -ri "cristy" .
git add .
git commit -m "Cambio a Aura Beauty"
git push
