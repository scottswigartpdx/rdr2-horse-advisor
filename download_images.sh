#!/bin/bash
# Download RDR2 Horse Images from Wiki
# Creates images in images/horses/ folder

mkdir -p images/horses

# User agent to avoid being blocked
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"

download() {
    local name="$1"
    local url="$2"
    local filename="images/horses/${name}.png"

    if [ ! -f "$filename" ]; then
        echo "Downloading: $name"
        curl -L -s -A "$UA" -o "$filename" "$url"
        sleep 0.5
    else
        echo "Skipping (exists): $name"
    fi
}

# Arabian
download "arabian_white" "https://static.wikia.nocookie.net/reddeadredemption/images/5/50/White_Arabian.PNG/revision/latest"
download "arabian_black" "https://static.wikia.nocookie.net/reddeadredemption/images/6/6c/Black_Arabian.PNG/revision/latest"
download "arabian_rose_grey_bay" "https://static.wikia.nocookie.net/reddeadredemption/images/a/aa/Rose_Gray_Bay_Arabian.PNG/revision/latest"
download "arabian_warped_brindle" "https://static.wikia.nocookie.net/reddeadredemption/images/2/27/Warped_Brindle_Arabian_New.PNG/revision/latest"
download "arabian_red_chestnut" "https://static.wikia.nocookie.net/reddeadredemption/images/3/33/Red_Chestnut_Arabian_%28Story_Mode%29.PNG/revision/latest"

# Turkoman
download "turkoman_gold" "https://static.wikia.nocookie.net/reddeadredemption/images/5/54/Gold_Turkoman.PNG/revision/latest"
download "turkoman_dark_bay" "https://static.wikia.nocookie.net/reddeadredemption/images/6/60/Dark_Bay_Turkoman_New.PNG/revision/latest"
download "turkoman_silver" "https://static.wikia.nocookie.net/reddeadredemption/images/e/e1/Silver_Turkoman.PNG/revision/latest"

# Missouri Fox Trotter
download "missouri_fox_trotter_amber_champagne" "https://static.wikia.nocookie.net/reddeadredemption/images/1/15/Amber_Champagne_Missouri_Fox_Trotter.PNG/revision/latest"
download "missouri_fox_trotter_silver_dapple_pinto" "https://static.wikia.nocookie.net/reddeadredemption/images/4/42/Silver_Dapple_Minto_Missouri_Fox_Trotter.PNG/revision/latest"

# Thoroughbred
download "thoroughbred_brindle" "https://static.wikia.nocookie.net/reddeadredemption/images/5/5f/Brindle_Thoroughbred_New.PNG/revision/latest"
download "thoroughbred_blood_bay" "https://static.wikia.nocookie.net/reddeadredemption/images/6/6f/Blood_Bay_Thoroughbred.PNG/revision/latest"
download "thoroughbred_dappled_black" "https://static.wikia.nocookie.net/reddeadredemption/images/e/e4/Dapple_Gray_Thoroughbred.PNG/revision/latest"

# Nokota
download "nokota_reverse_dapple_roan" "https://static.wikia.nocookie.net/reddeadredemption/images/3/33/Reverse_Dapple_Roan_Nokota.PNG/revision/latest"
download "nokota_blue_roan" "https://static.wikia.nocookie.net/reddeadredemption/images/4/4b/Blue_Roan_Nokota.PNG/revision/latest"

# Andalusian
download "andalusian_perlino" "https://static.wikia.nocookie.net/reddeadredemption/images/8/81/Perlino_Andalusian.PNG/revision/latest"
download "andalusian_dark_bay" "https://static.wikia.nocookie.net/reddeadredemption/images/6/66/Dark_Bay_Andalusian.PNG/revision/latest"
download "andalusian_rose_grey" "https://static.wikia.nocookie.net/reddeadredemption/images/c/c6/Rose_Gray_Andalusian.PNG/revision/latest"

# Ardennes
download "ardennes_bay_roan" "https://static.wikia.nocookie.net/reddeadredemption/images/0/01/Bay_Roan_Ardennes.PNG/revision/latest"
download "ardennes_strawberry_roan" "https://static.wikia.nocookie.net/reddeadredemption/images/5/51/Strawberry_Roan_Ardennes.PNG/revision/latest"
download "ardennes_iron_grey" "https://static.wikia.nocookie.net/reddeadredemption/images/9/99/Iron_Grey_Roan_Ardennes.PNG/revision/latest"

# Dutch Warmblood
download "dutch_warmblood_chocolate_roan" "https://static.wikia.nocookie.net/reddeadredemption/images/2/29/Chocolate_Roan_Dutch_Warmblood.PNG/revision/latest"
download "dutch_warmblood_seal_brown" "https://static.wikia.nocookie.net/reddeadredemption/images/0/0f/Seal_Brown_Dutch_Warmblood.PNG/revision/latest"
download "dutch_warmblood_sooty_buckskin" "https://static.wikia.nocookie.net/reddeadredemption/images/2/22/Sooty_Buckskin_Dutch_Warmblood.PNG/revision/latest"
download "dutch_warmblood_buell" "https://static.wikia.nocookie.net/reddeadredemption/images/c/c4/BuellFace.PNG/revision/latest"

# Hungarian Halfbred
download "hungarian_halfbred_dapple_dark_grey" "https://static.wikia.nocookie.net/reddeadredemption/images/5/59/Dapple_Dark_Gray_Hungarian_Halfbred.PNG/revision/latest"
download "hungarian_halfbred_piebald_tobiano" "https://static.wikia.nocookie.net/reddeadredemption/images/6/6a/Piebald_Tobiano_Hungarian_Halfbred.PNG/revision/latest"

# Mustang
download "mustang_grullo_dun" "https://static.wikia.nocookie.net/reddeadredemption/images/5/57/Grull_Dun_Mustang.PNG/revision/latest"
download "mustang_wild_bay" "https://static.wikia.nocookie.net/reddeadredemption/images/c/cc/Wild_Bay_Mustang.PNG/revision/latest"
download "mustang_tiger_striped_bay" "https://static.wikia.nocookie.net/reddeadredemption/images/4/44/Tiger_Striped_Bay_Mustang.PNG/revision/latest"

# Appaloosa
download "appaloosa_blanket" "https://static.wikia.nocookie.net/reddeadredemption/images/3/36/Blanket_Appaloosa.PNG/revision/latest"
download "appaloosa_brown_leopard" "https://static.wikia.nocookie.net/reddeadredemption/images/6/6e/Brown_Leopard_Appaloosa.PNG/revision/latest"
download "appaloosa_few_spotted" "https://static.wikia.nocookie.net/reddeadredemption/images/a/a7/Few_Spotted_Appaloosa.PNG/revision/latest"

# American Standardbred
download "american_standardbred_palomino_dapple" "https://static.wikia.nocookie.net/reddeadredemption/images/1/19/Palomino_Dapple_American_Standardbred.PNG/revision/latest"
download "american_standardbred_black" "https://static.wikia.nocookie.net/reddeadredemption/images/e/e1/Black_American_Standardbred.PNG/revision/latest"

# American Paint
download "american_paint_grey_overo" "https://static.wikia.nocookie.net/reddeadredemption/images/b/b6/Gray_Overo_American_Paint.PNG/revision/latest"
download "american_paint_splashed_white" "https://static.wikia.nocookie.net/reddeadredemption/images/e/e3/Splashed_White_American_Paint.PNG/revision/latest"

# Kentucky Saddler
download "kentucky_saddler_grey" "https://static.wikia.nocookie.net/reddeadredemption/images/b/bb/Gray_Kentucky_Saddler.PNG/revision/latest"
download "kentucky_saddler_black" "https://static.wikia.nocookie.net/reddeadredemption/images/6/6d/Black_Kentucky_Saddler.PNG/revision/latest"

# Morgan
download "morgan_bay" "https://static.wikia.nocookie.net/reddeadredemption/images/b/b5/RDR2Horse.PNG/revision/latest"
download "morgan_palomino" "https://static.wikia.nocookie.net/reddeadredemption/images/6/6b/Palomino_Morgan.PNG/revision/latest"

# Tennessee Walker
download "tennessee_walker_dapple_bay" "https://static.wikia.nocookie.net/reddeadredemption/images/6/6c/Dapple_Bay_Tennessee_Walker.PNG/revision/latest"

# Shire
download "shire_raven_black" "https://static.wikia.nocookie.net/reddeadredemption/images/7/75/Raven_Black_Shire.PNG/revision/latest"
download "shire_dark_bay" "https://static.wikia.nocookie.net/reddeadredemption/images/b/b2/Dark_Bay_Shire.PNG/revision/latest"

# Suffolk Punch
download "suffolk_punch_sorrel" "https://static.wikia.nocookie.net/reddeadredemption/images/c/c0/Sorrel_Suffolk_Punch.PNG/revision/latest"

# Belgian Draft
download "belgian_draft_blonde_chestnut" "https://static.wikia.nocookie.net/reddeadredemption/images/3/3c/Blond_Chestnut_Belgian_Draft.PNG/revision/latest"
download "belgian_draft_mealy_chestnut" "https://static.wikia.nocookie.net/reddeadredemption/images/6/62/Mealy_Chestnut_Belgian_Draft.PNG/revision/latest"

echo "Done! Downloaded images to images/horses/"
